import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import {
  createWriteStream, mkdirSync, accessSync, constants, statSync, renameSync,
  readFileSync, writeFileSync
} from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findFreePort } from './lib/free-port.js'
import { resolveDataDir, resolvePhpBinary } from './lib/data-dir.js'
import { buildPhpArgs } from './lib/php-args.js'

const here = path.dirname(fileURLToPath(import.meta.url))

const resourcesPath = app.isPackaged ? process.resourcesPath : path.resolve(here, '..')
const routerScript = app.isPackaged
  ? path.join(resourcesPath, 'router.php')
  : path.join(here, 'router.php')
const phpDirRoot = app.isPackaged ? resourcesPath : here

const dataDir = resolveDataDir({
  platform: process.platform,
  execPath: app.getPath('exe'),
  isPackaged: app.isPackaged,
  projectRoot: here
})

// Must run before app.whenReady() so Chromium puts localStorage and IndexedDB
// in the portable folder rather than ~/Library/Application Support.
app.setPath('userData', path.join(dataDir, 'chromium'))

let phpProcess = null
let mainWindow = null
let port = null
let quitting = false
let lastStderr = ''

function fatal(title, detail) {
  dialog.showErrorBox(title, detail)
  quitting = true
  app.quit()
}

function ensureDataDir() {
  try {
    mkdirSync(path.join(dataDir, 'sessions'), { recursive: true })
    mkdirSync(path.join(dataDir, 'tmp'), { recursive: true })
    mkdirSync(path.join(dataDir, 'logs'), { recursive: true })
    accessSync(dataDir, constants.W_OK)
  } catch (err) {
    fatal(
      'Cannot write application data',
      `The app needs to write to:\n\n${dataDir}\n\n` +
      `Move the extracted folder somewhere writable (for example your Desktop) and try again.\n\n${err.message}`
    )
    return false
  }
  return true
}

/** Keep php.log from growing without bound. */
function rotateLog(logPath) {
  try {
    if (statSync(logPath).size > 5 * 1024 * 1024) {
      renameSync(logPath, `${logPath}.1`)
    }
  } catch {
    // no existing log — nothing to rotate
  }
}

function isPortFree(candidate, host) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.listen(candidate, host, () => srv.close(() => resolve(true)))
  })
}

/**
 * Reuse the port from the previous launch when possible, falling back to a
 * fresh free port otherwise. This matters because mainWindow.loadURL points
 * at http://127.0.0.1:<port>/, and Chromium's localStorage/IndexedDB (where
 * the frontend keeps saved connections, per ModalFormComponent.vue) is
 * partitioned by full origin, port included. A brand-new random port on
 * every launch — the plan's original design — silently discards all saved
 * connections on every restart, since the app never revisits the origin it
 * wrote them under. Persisting the last port beside the data dir keeps the
 * origin (and therefore the user's data) stable across the common case of a
 * single instance restarting on an otherwise-idle machine.
 */
async function pickPort(host) {
  const portFile = path.join(dataDir, '.port')
  let previous = null
  try {
    previous = parseInt(readFileSync(portFile, 'utf8'), 10)
  } catch {
    // no previous port recorded — first launch
  }

  const chosen = (previous && (await isPortFree(previous, host)))
    ? previous
    : await findFreePort(host)

  try {
    writeFileSync(portFile, String(chosen))
  } catch {
    // non-fatal — worst case we pick a fresh port again next launch
  }

  return chosen
}

function startPhp(chosenPort) {
  const phpBin = resolvePhpBinary({
    platform: process.platform,
    arch: process.arch,
    resourcesPath: phpDirRoot
  })

  try {
    accessSync(phpBin, constants.X_OK)
  } catch {
    fatal(
      'PHP runtime missing',
      `Expected a PHP binary at:\n\n${phpBin}\n\n` +
      `If you are running from source, run "npm run php:fetch" in the desktop/ folder.`
    )
    return null
  }

  const args = buildPhpArgs({
    port: chosenPort,
    docRoot: path.join(resourcesPath, 'public'),
    routerScript,
    dataDir
  })

  const child = spawn(phpBin, args, { stdio: ['ignore', 'pipe', 'pipe'] })

  const logPath = path.join(dataDir, 'logs', 'php.log')
  rotateLog(logPath)
  const log = createWriteStream(logPath, { flags: 'a' })
  child.stdout.pipe(log)
  child.stderr.pipe(log)

  child.stderr.on('data', (buf) => {
    lastStderr = (lastStderr + buf.toString()).slice(-4000)
  })

  child.on('exit', (code, signal) => {
    if (quitting) return
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Backend stopped',
      message: 'The PHP backend stopped unexpectedly.',
      detail: `Exit code: ${code ?? signal}\n\nLog: ${logPath}\n\n${lastStderr.slice(-1500)}`,
      buttons: ['Restart backend', 'Quit'],
      defaultId: 0,
      cancelId: 1
    })
    if (choice === 0) {
      boot().catch((err) => fatal('Restart failed', err.message))
    } else {
      quitting = true
      app.quit()
    }
  })

  return child
}

async function waitForReady(chosenPort, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${chosenPort}/`)
      if (res.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(`The backend did not start within ${timeoutMs / 1000} seconds.`)
}

async function boot() {
  let lastErr = null

  for (let attempt = 0; attempt < 3; attempt++) {
    // Sticky port only on the first attempt — if it didn't work out, fall
    // back to the original diversify-and-retry behavior rather than
    // hammering the same problem port three times.
    port = attempt === 0 ? await pickPort('127.0.0.1') : await findFreePort()
    phpProcess = startPhp(port)
    if (!phpProcess) return

    try {
      await waitForReady(port)
      lastErr = null
      break
    } catch (err) {
      lastErr = err
      quitting = true
      phpProcess.kill('SIGKILL')
      quitting = false
      phpProcess = null
    }
  }

  if (lastErr) {
    fatal(
      'Backend failed to start',
      `${lastErr.message}\n\nLast output from PHP:\n\n${lastStderr.slice(-2000)}`
    )
    return
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    await mainWindow.loadURL(`http://127.0.0.1:${port}/`)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'JTL Connector Tester',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(here, 'preload.js')
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Never navigate away from the local backend.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}/`)) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  if (!ensureDataDir()) return
  createWindow()
  await boot()
})

app.on('window-all-closed', () => {
  quitting = true
  app.quit()
})

app.on('before-quit', () => {
  quitting = true
  if (!phpProcess) return
  phpProcess.kill('SIGTERM')
  const child = phpProcess
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }, 2000)
})

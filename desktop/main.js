import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import {
  createWriteStream, mkdirSync, accessSync, constants, statSync, renameSync
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findFreePort } from './lib/free-port.js'
import { resolveDataDir, resolvePhpBinary } from './lib/data-dir.js'
import { buildPhpArgs } from './lib/php-args.js'
import { pickPort } from './lib/port-selection.js'

const here = path.dirname(fileURLToPath(import.meta.url))

// Single-instance guard. Every instance points app.setPath('userData', ...)
// at the same portable data/chromium folder (see below) and the sticky-port
// file at data/.port. A second instance would race the first for that port
// file and for the shared Chromium profile: it would find the port busy,
// fall back to a fresh random one, and overwrite `.port` with it — so the
// *next* single launch would land on a different origin and lose every
// saved connection, the exact failure the sticky-port mechanism exists to
// prevent (and it needs no user error, just a stray double-click on a
// no-installer, "extract and run" app). Must run before app.whenReady().
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

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

/**
 * Slim's error middleware runs with logErrorDetails=true
 * (src/Controller/Kernel.php), so an uncaught exception's stack trace —
 * written to PHP's stderr, which we tee into data/logs/php.log and surface
 * verbatim in crash dialogs below — can include a fragment of the connector
 * token: it's a constructor argument on AuthController, which sits on that
 * stack. PHP's own trace formatter truncates any string argument longer than
 * 15 characters to `'<first 15 chars>...'`, which is exactly the shape a
 * bearer token or connector secret takes in that output. `data/` is
 * documented as portable (carried on a USB stick), so strip that pattern
 * before it ever reaches disk or a dialog rather than relying on the PHP
 * side alone to not log it.
 */
function redactSecrets(text) {
  return text.replace(/'[^'\n]*\.\.\.'/g, "'[REDACTED]'")
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
  child.stdout.on('data', (buf) => log.write(redactSecrets(buf.toString())))

  child.stderr.on('data', (buf) => {
    const redacted = redactSecrets(buf.toString())
    log.write(redacted)
    lastStderr = (lastStderr + redacted).slice(-4000)
  })

  child.on('exit', (code, signal) => {
    // `quitting` covers deliberate app-level shutdowns (before-quit,
    // window-all-closed, the "Quit" choice below). `child.expectedExit`
    // covers boot()'s own retry loop killing a PHP process that never
    // became ready: that kill is synchronous but 'exit' fires asynchronously,
    // so a shared flag toggled true-then-false around the kill() call is
    // already back to false by the time this handler runs, and the "Backend
    // stopped" dialog used to fire for a process the app killed on purpose.
    // Tagging the child itself survives until the handler actually runs.
    if (quitting || child.expectedExit) return
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

// Re-entrancy guard: without it, "Restart backend" (triggered from a PHP
// child's 'exit' handler) could run concurrently with an already-in-flight
// boot() — e.g. the boot loop's own retry after a failed waitForReady. Both
// calls would overwrite the module-level `phpProcess`/`port`, and the
// loser's child would never be tracked or killed, leaking an orphan
// `php -S 127.0.0.1:<port>` that outlives the app and holds a port that the
// *next* launch's sticky-port logic then can't reuse either.
let bootInFlight = false

async function boot() {
  if (bootInFlight) return
  bootInFlight = true
  try {
    let lastErr = null

    for (let attempt = 0; attempt < 3; attempt++) {
      // Sticky port only on the first attempt — if it didn't work out, fall
      // back to the original diversify-and-retry behavior rather than
      // hammering the same problem port three times.
      port = attempt === 0
        ? await pickPort('127.0.0.1', path.join(dataDir, '.port'))
        : await findFreePort()
      phpProcess = startPhp(port)
      if (!phpProcess) return

      try {
        await waitForReady(port)
        lastErr = null
        break
      } catch (err) {
        lastErr = err
        // Tag the child as an expected exit *before* killing it so the
        // 'exit' handler (which fires asynchronously) can tell this apart
        // from a genuine crash — see the comment on that handler.
        phpProcess.expectedExit = true
        phpProcess.kill('SIGKILL')
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
  } finally {
    bootInFlight = false
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
  // app.quit() after a failed requestSingleInstanceLock() does not
  // synchronously abort a whenReady() that was already about to resolve —
  // guard explicitly so a losing second instance never spins up a second
  // backend before it exits.
  if (!gotSingleInstanceLock) return
  try {
    if (!ensureDataDir()) return
    createWindow()
    await boot()
  } catch (err) {
    fatal('Unexpected startup error', err?.stack || err?.message || String(err))
  }
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

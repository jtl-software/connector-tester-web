import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import {
  createWriteStream, mkdirSync, accessSync, constants, statSync, renameSync, writeFileSync
} from 'node:fs'
import { Transform } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { findFreePort } from './lib/free-port.js'
import { resolveDataDir, resolvePhpBinary } from './lib/data-dir.js'
import { buildPhpArgs } from './lib/php-args.js'
import { pickPort, DEFAULT_PORT } from './lib/port-selection.js'

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

// Must run before app.whenReady() AND before requestSingleInstanceLock() below.
// Chromium creates both the userData profile (localStorage/IndexedDB) and the
// single-instance lock files (SingletonLock/SingletonCookie/SingletonSocket)
// against whatever userData path is current at the moment each call is made.
// Getting this order wrong (setPath after the lock request) was verified to
// leave a stray SingletonLock in the OS-default
// `~/Library/Application Support/<app>/` directory instead of the portable
// `data/chromium/` — breaking portability and making the lock global to the
// machine+user instead of scoped to this particular portable data/ folder (so
// a second portable copy of the app, e.g. one on a USB stick, could no longer
// run alongside this one).
app.setPath('userData', path.join(dataDir, 'chromium'))

// Single-instance guard. Every instance points app.setPath('userData', ...)
// (above, and now genuinely before this call) at the same portable
// data/chromium folder and the sticky-port file at data/.port. A second
// instance would race the first for that port file and for the shared
// Chromium profile: it would find the port busy, fall back to a fresh random
// one, and overwrite `.port` with it — so the *next* single launch would land
// on a different origin and lose every saved connection, the exact failure
// the sticky-port mechanism exists to prevent (and it needs no user error,
// just a stray double-click on a no-installer, "extract and run" app). Must
// run before app.whenReady().
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
 * Defence in depth only: `src/Controller/Kernel.php` now runs
 * `addErrorMiddleware(true, true, false)` — `logErrorDetails` is off, so Slim
 * itself no longer emits full stack traces (with bound constructor arguments,
 * e.g. the connector token on AuthController) to stderr. This redaction stays
 * as a second layer in case any future exception path (or a library) prints a
 * truncated string argument in PHP's `'<first 15 chars>...'` shape into
 * stdout/stderr, which we tee into data/logs/php.log and surface verbatim in
 * crash dialogs below. `data/` is documented as portable (carried on a USB
 * stick), so it's worth stripping that pattern before it ever reaches disk or
 * a dialog rather than relying on a single layer to not log it.
 *
 * Known gaps (tracked, not fixed here): tokens of 15 chars or fewer aren't
 * truncated by PHP at all so this pattern never matches them, and a trace
 * split across two stream chunks can straddle the quotes so neither half
 * matches. Turning off `logErrorDetails` at the source (above) closes the
 * actual leak; this function is a backstop for whatever it doesn't catch.
 */
function redactSecrets(text) {
  return text.replace(/'[^'\n]*\.\.\.'/g, "'[REDACTED]'")
}

/**
 * Wrap a child's stdout/stderr in a Transform that redacts secrets, so it can
 * be `.pipe()`d into the log file — piping (rather than `.on('data', ...)`)
 * lets Node's stream machinery apply backpressure: if the disk write falls
 * behind, the pipe pauses the child's stream instead of buffering everything
 * in main-process memory. `onChunk` is an optional extra sink (used to also
 * accumulate stderr into `lastStderr` for crash dialogs).
 */
function createRedactingStream(onChunk) {
  return new Transform({
    transform(chunk, _enc, callback) {
      const redacted = redactSecrets(chunk.toString())
      if (onChunk) onChunk(redacted)
      callback(null, redacted)
    }
  })
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

  // `.pipe()` (not `.on('data', ...)` + manual `.write()`) so Node applies
  // backpressure automatically, and `{ end: false }` because both stdout and
  // stderr pipe into the same write stream — piping with default options
  // would end/close `log` as soon as the first of the two child streams
  // ends, breaking the other. The stream is explicitly `.end()`ed in the
  // `exit` handler below instead, so every restart closes its own fd rather
  // than leaking one per boot.
  child.stdout.pipe(createRedactingStream()).pipe(log, { end: false })
  child.stderr
    .pipe(createRedactingStream((chunk) => { lastStderr = (lastStderr + chunk).slice(-4000) }))
    .pipe(log, { end: false })

  child.on('exit', (code, signal) => {
    log.end()
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
// Set when boot() is called while one is already running. Rather than the
// click doing nothing at all (the previous behaviour — a bad signal in a
// modal that's already telling the user something is broken), the request is
// queued and honoured once the in-flight boot settles, and the user is told
// immediately that their click was received.
let restartRequested = false

async function boot() {
  if (bootInFlight) {
    restartRequested = true
    dialog.showMessageBox({
      type: 'info',
      title: 'Restart already in progress',
      message: 'The backend is already restarting. It will pick up this request once the current attempt finishes.'
    })
    return
  }
  bootInFlight = true
  try {
    const portFile = path.join(dataDir, '.port')
    let lastErr = null

    for (let attempt = 0; attempt < 3; attempt++) {
      // Sticky port only on the first attempt — if it didn't work out, fall
      // back to the original diversify-and-retry behavior rather than
      // hammering the same problem port three times.
      port = attempt === 0
        ? await pickPort('127.0.0.1', portFile)
        : await findFreePort()

      // pickPort() already records the port it chose (the default, or a
      // sticky fallback) in `.port`. The diversify-and-retry attempts below
      // bypass pickPort, but the port they land on still needs to be
      // inspectable on disk, and — more importantly — needs to be picked up
      // as "the known fallback" by pickPort() on the *next* launch, so record
      // it here too instead of leaving `.port` stale.
      if (attempt > 0) {
        try {
          writeFileSync(portFile, String(port))
        } catch {
          // non-fatal — worst case the next launch picks a fresh port again
        }
      }

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

    if (port !== DEFAULT_PORT) {
      // The renderer's origin is http://127.0.0.1:<port>/, and localStorage /
      // IndexedDB — where saved connections, history, and saved payloads live
      // — are partitioned by that origin. Landing on a non-default port means
      // everything saved under the usual origin is invisible for this
      // session. Silently showing what looks like a pristine, empty app is
      // indistinguishable from data loss (this is QA case 2c / review N2), so
      // say so plainly instead of letting the user find out the hard way.
      dialog.showMessageBox({
        type: 'warning',
        title: 'Backend is using a different port',
        message: `Another program on this computer is already using port ${DEFAULT_PORT}, so the ` +
          `backend started on port ${port} instead.`,
        detail:
          'Your saved connections, history, and saved payloads are tied to the usual port and ' +
          `will not be visible until port ${DEFAULT_PORT} is free again. Nothing has been deleted.\n\n` +
          `Quit whichever other program is using port ${DEFAULT_PORT}, then relaunch this app to ` +
          'get them back.'
      })
    }
  } finally {
    bootInFlight = false
    if (restartRequested) {
      restartRequested = false
      boot().catch((err) => fatal('Restart failed', err.message))
    }
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

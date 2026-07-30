# Desktop App (Electron + bundled static PHP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the JTL Connector Tester as portable, self-contained macOS and Windows desktop applications that need no PHP, Composer, or Node installed on the user's machine.

**Architecture:** Electron's main process spawns a bundled static PHP CLI binary running PHP's built-in server on a random free port bound to `127.0.0.1`, document root `public/`. The `BrowserWindow` loads `http://127.0.0.1:<port>/`. Because PHP serves both the SPA and the API from one origin, the existing `src/` and `frontend/` code needs no changes — relative axios calls, `withCredentials`, and `session_start()` all work as-is.

**Tech Stack:** Electron 43, electron-builder 26, static PHP 8.2+ (static-php-cli), Node's built-in `node:test` runner.

**Spec:** `docs/superpowers/specs/2026-07-30-desktop-app-electron-design.md`

**Branch:** `feature/desktop-electron-app`

## Global Constraints

- All new code lives under `desktop/`. Do **not** modify `src/`, `frontend/`, `public/index.php`, or `.gitlab-ci.yml`.
- The PHP server must bind to `127.0.0.1` only — never `0.0.0.0`.
- Distribution target is **`zip` only** for both platforms. No NSIS, no dmg, no installer.
- Builds are produced **on macOS**, for both macOS and Windows. No CI, no signing, no notarization.
- User data ("portable data") lives **beside the app**, never in the OS user data directory.
- Renderer security is non-negotiable: `contextIsolation: true`, `nodeIntegration: false`.
- Static PHP must include: `fileinfo`, `iconv`, `json`, `mbstring`, `pdo`, `sqlite3`, `tokenizer`, `zip`, `session`, `openssl`, `curl`.
- PHP binaries are **not** committed to git. Their download URLs and SHA-256 checksums are.
- Commit after every task.

---

### Task 1: Scaffold `desktop/` and the pure helper modules

The three helpers are pure functions with no Electron or filesystem dependencies, so they are unit-testable without launching anything. Platform path resolution is the single most likely place for a portable-data bug, so it gets the most test attention.

**Files:**
- Create: `desktop/package.json`
- Create: `desktop/lib/free-port.js`
- Create: `desktop/lib/data-dir.js`
- Create: `desktop/lib/php-args.js`
- Test: `desktop/lib/data-dir.test.js`
- Test: `desktop/lib/php-args.test.js`
- Test: `desktop/lib/free-port.test.js`

**Interfaces:**
- Produces:
  - `findFreePort(host?: string): Promise<number>`
  - `resolveDataDir({ platform, execPath, isPackaged, projectRoot }): string`
  - `resolvePhpBinary({ platform, arch, resourcesPath }): string`
  - `buildPhpArgs({ port, docRoot, routerScript, dataDir }): string[]`

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "jtl-connector-tester-desktop",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "main.js",
  "scripts": {
    "test": "node --test lib/",
    "start": "electron .",
    "php:fetch": "./scripts/fetch-php.sh",
    "smoke": "node scripts/smoke.js"
  },
  "devDependencies": {
    "electron": "^43.2.0",
    "electron-builder": "^26.15.3"
  }
}
```

- [ ] **Step 2: Write the failing tests for `data-dir.js`**

Create `desktop/lib/data-dir.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDataDir, resolvePhpBinary } from './data-dir.js'

test('macOS: data dir is a sibling of the .app bundle, not inside it', () => {
  const result = resolveDataDir({
    platform: 'darwin',
    execPath: '/Users/p/Downloads/tester/JTL Connector Tester.app/Contents/MacOS/JTL Connector Tester',
    isPackaged: true,
    projectRoot: '/irrelevant'
  })
  assert.equal(result, '/Users/p/Downloads/tester/data')
})

test('Windows: data dir sits next to the .exe', () => {
  const result = resolveDataDir({
    platform: 'win32',
    execPath: 'C:\\Users\\p\\tester\\JTL Connector Tester.exe',
    isPackaged: true,
    projectRoot: 'C:\\irrelevant'
  })
  assert.equal(result, 'C:\\Users\\p\\tester\\data')
})

test('unpackaged dev run never writes into node_modules', () => {
  const result = resolveDataDir({
    platform: 'darwin',
    execPath: '/repo/desktop/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
    isPackaged: false,
    projectRoot: '/repo/desktop'
  })
  assert.equal(result, '/repo/desktop/.dev-data')
})

test('php binary path is platform and arch specific', () => {
  assert.equal(
    resolvePhpBinary({ platform: 'darwin', arch: 'arm64', resourcesPath: '/res' }),
    '/res/php/darwin-arm64/php'
  )
  assert.equal(
    resolvePhpBinary({ platform: 'win32', arch: 'x64', resourcesPath: '/res' }),
    '/res/php/win32-x64/php.exe'
  )
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd desktop && node --test lib/data-dir.test.js`
Expected: FAIL — `Cannot find module './data-dir.js'`

- [ ] **Step 4: Implement `data-dir.js`**

Note the deliberate use of `path.win32` / `path.posix`: the tests must pass on macOS while asserting Windows-shaped paths, so the module cannot use the ambient `path` separator.

```js
import path from 'node:path'

/**
 * Resolve the portable data directory — always beside the app, never in the
 * OS user data dir, so copying the extracted folder carries saved connections,
 * history, and payloads with it.
 */
export function resolveDataDir({ platform, execPath, isPackaged, projectRoot }) {
  const p = platform === 'win32' ? path.win32 : path.posix

  if (!isPackaged) {
    return p.join(projectRoot, '.dev-data')
  }

  const exeDir = p.dirname(execPath)

  if (platform === 'darwin') {
    // execPath is <root>/Name.app/Contents/MacOS/Name — climb out of the
    // bundle so data/ is a visible sibling of the .app.
    return p.resolve(exeDir, '..', '..', '..', 'data')
  }

  return p.join(exeDir, 'data')
}

export function resolvePhpBinary({ platform, arch, resourcesPath }) {
  const p = platform === 'win32' ? path.win32 : path.posix
  const binary = platform === 'win32' ? 'php.exe' : 'php'
  return p.join(resourcesPath, 'php', `${platform}-${arch}`, binary)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd desktop && node --test lib/data-dir.test.js`
Expected: PASS — 4 tests

- [ ] **Step 6: Write the failing test for `php-args.js`**

Create `desktop/lib/php-args.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPhpArgs } from './php-args.js'

test('binds to loopback only and points PHP at the portable data dir', () => {
  const args = buildPhpArgs({
    port: 51234,
    docRoot: '/res/public',
    routerScript: '/res/router.php',
    dataDir: '/app/data'
  })

  const joined = args.join(' ')
  assert.ok(joined.includes('-S 127.0.0.1:51234'), 'must bind loopback')
  assert.ok(!joined.includes('0.0.0.0'), 'must never bind all interfaces')
  assert.ok(joined.includes('session.save_path=/app/data/sessions'))
  assert.ok(joined.includes('sys_temp_dir=/app/data/tmp'))
  assert.equal(args[args.length - 1], '/res/router.php', 'router script goes last')
  assert.ok(args.includes('/res/public'))
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd desktop && node --test lib/php-args.test.js`
Expected: FAIL — `Cannot find module './php-args.js'`

- [ ] **Step 8: Implement `php-args.js`**

```js
import path from 'node:path'

export function buildPhpArgs({ port, docRoot, routerScript, dataDir }) {
  const sessions = path.join(dataDir, 'sessions')
  const tmp = path.join(dataDir, 'tmp')

  return [
    '-d', `session.save_path=${sessions}`,
    '-d', `sys_temp_dir=${tmp}`,
    '-d', `upload_tmp_dir=${tmp}`,
    '-d', 'display_errors=0',
    '-d', 'log_errors=1',
    '-S', `127.0.0.1:${port}`,
    '-t', docRoot,
    routerScript
  ]
}
```

- [ ] **Step 9: Run it to verify it passes**

Run: `cd desktop && node --test lib/php-args.test.js`
Expected: PASS — 1 test

- [ ] **Step 10: Write the failing test for `free-port.js`**

Create `desktop/lib/free-port.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { findFreePort } from './free-port.js'

test('returns a port that can actually be bound', async () => {
  const port = await findFreePort()
  assert.ok(port > 1024 && port < 65536, `implausible port: ${port}`)

  await new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.on('error', reject)
    srv.listen(port, '127.0.0.1', () => srv.close(resolve))
  })
})

test('successive calls do not collide', async () => {
  const a = await findFreePort()
  const b = await findFreePort()
  assert.ok(typeof a === 'number' && typeof b === 'number')
})
```

- [ ] **Step 11: Run it to verify it fails**

Run: `cd desktop && node --test lib/free-port.test.js`
Expected: FAIL — `Cannot find module './free-port.js'`

- [ ] **Step 12: Implement `free-port.js`**

```js
import net from 'node:net'

/** Ask the OS for an unused port by binding port 0, then releasing it. */
export function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, host, () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}
```

- [ ] **Step 13: Run the whole suite**

Run: `cd desktop && npm test`
Expected: PASS — 7 tests across 3 files

- [ ] **Step 14: Commit**

```bash
git add desktop/package.json desktop/lib/
git commit -m "feat(desktop): add pure helpers for port, data dir, and php args"
```

---

### Task 2: PHP router and the headless smoke test

Proves the PHP half works before any Electron code exists. `php -S` serves files that exist under the document root and routes everything else to the router script; `public/index.php` cannot be the router because it never returns `false`, so asset requests would reach Slim and 404.

**Files:**
- Create: `desktop/router.php`
- Create: `desktop/scripts/smoke.js`

**Interfaces:**
- Consumes: `findFreePort`, `buildPhpArgs` from Task 1.
- Produces: `desktop/router.php`, referenced by `main.js` in Task 3.

- [ ] **Step 1: Write the router**

Create `desktop/router.php`. Note `__DIR__` resolves to the staged resources root at runtime, where `router.php` sits beside `public/`.

```php
<?php

declare(strict_types=1);

$path = \parse_url($_SERVER['REQUEST_URI'], \PHP_URL_PATH);

if (!\is_string($path)) {
    $path = '/';
}

$candidate = __DIR__ . '/public' . $path;

// Let the built-in server handle real files (JS, CSS, favicon) itself.
if ($path !== '/' && \is_file($candidate)) {
    return false;
}

require __DIR__ . '/public/index.php';
```

- [ ] **Step 2: Write the smoke test**

Create `desktop/scripts/smoke.js`. It boots PHP exactly the way `main.js` will, so a break here is a break there.

```js
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { findFreePort } from '../lib/free-port.js'
import { buildPhpArgs } from '../lib/php-args.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const dataDir = path.join(here, '..', '.smoke-data')

const phpBin = process.env.PHP_BIN ?? 'php'

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`)
  process.exitCode = 1
}

async function waitForReady(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`)
      if (res.ok) return res
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 150))
  }
  throw new Error(`server did not become ready within ${timeoutMs}ms`)
}

rmSync(dataDir, { recursive: true, force: true })
mkdirSync(path.join(dataDir, 'sessions'), { recursive: true })
mkdirSync(path.join(dataDir, 'tmp'), { recursive: true })

const port = await findFreePort()
const args = buildPhpArgs({
  port,
  docRoot: path.join(repoRoot, 'public'),
  routerScript: path.join(here, '..', 'router.php'),
  dataDir
})

const child = spawn(phpBin, args, { stdio: ['ignore', 'pipe', 'pipe'] })
let stderr = ''
child.stderr.on('data', (b) => { stderr += b.toString() })

try {
  const indexRes = await waitForReady(port)
  const html = await indexRes.text()

  if (!html.includes('<div id="app">')) {
    fail('GET / did not return the SPA shell — did you run the frontend build?')
  } else {
    console.log('OK  GET / serves the SPA shell')
  }

  const authRes = await fetch(`http://127.0.0.1:${port}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'connectorUrl=http://127.0.0.1:1/nope&connectorToken=bogus'
  })

  const contentType = authRes.headers.get('content-type') ?? ''
  if (!contentType.includes('json') && !(await authRes.clone().text()).trim().startsWith('{')) {
    fail(`POST /authenticate returned non-JSON (content-type: ${contentType})`)
  } else {
    console.log('OK  POST /authenticate returns JSON')
  }
} catch (err) {
  fail(`${err.message}\n--- php stderr ---\n${stderr}`)
} finally {
  child.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 300))
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL')
    fail('php did not exit on SIGTERM')
  } else {
    console.log('OK  php exited cleanly')
  }
  rmSync(dataDir, { recursive: true, force: true })
}

if (process.exitCode) {
  console.error('\nSMOKE TEST FAILED')
} else {
  console.log('\nSMOKE TEST PASSED')
}
```

- [ ] **Step 3: Build the frontend so `public/frontend/index.html` exists**

Run from the repo root:

```bash
cd frontend && npm install && npm run build && cd ..
```

Expected: `public/frontend/index.html` and `public/frontend/assets/` exist.

- [ ] **Step 4: Run the smoke test against system PHP**

Run: `cd desktop && npm run smoke`
Expected: three `OK` lines and `SMOKE TEST PASSED`.

If `GET /` fails with a 404 on assets, the router's `is_file` branch is wrong. If `POST /authenticate` returns HTML, Slim's error middleware is rendering — read the printed stderr.

- [ ] **Step 5: Commit**

```bash
git add desktop/router.php desktop/scripts/smoke.js
git commit -m "feat(desktop): add php router and headless smoke test"
```

---

### Task 3: Fetch and verify the static PHP binaries

**Files:**
- Create: `desktop/scripts/fetch-php.sh`
- Create: `desktop/php/.gitignore`
- Create: `desktop/php/checksums.txt`

**Interfaces:**
- Produces: binaries at `desktop/php/darwin-arm64/php`, `desktop/php/darwin-x64/php`, `desktop/php/win32-x64/php.exe`, consumed by Task 5's packaging config.

- [ ] **Step 1: Keep binaries out of git**

Create `desktop/php/.gitignore`:

```gitignore
*
!.gitignore
!checksums.txt
```

- [ ] **Step 2: Write the fetch script**

Create `desktop/scripts/fetch-php.sh`, `chmod +x` it.

The URLs below point at static-php-cli's published builds. **Verify the exact filenames for the current release before running** — static-php-cli's naming has changed across versions. The script fails loudly rather than silently producing a broken bundle.

```bash
#!/usr/bin/env bash
set -euo pipefail

PHP_VERSION="${PHP_VERSION:-8.2.29}"
BASE="https://dl.static-php.dev/static-php-cli/common"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_DIR="${HERE}/../php"

# target-triple  archive-name  binary-name
TARGETS=(
  "darwin-arm64 php-${PHP_VERSION}-cli-macos-aarch64.tar.gz php"
  "darwin-x64   php-${PHP_VERSION}-cli-macos-x86_64.tar.gz  php"
  "win32-x64    php-${PHP_VERSION}-cli-win.zip              php.exe"
)

REQUIRED_EXTS="fileinfo iconv json mbstring pdo sqlite3 tokenizer zip session openssl curl"

for entry in "${TARGETS[@]}"; do
  read -r triple archive binary <<< "${entry}"
  dest="${PHP_DIR}/${triple}"
  mkdir -p "${dest}"

  if [[ -x "${dest}/${binary}" ]]; then
    echo "==> ${triple}: already present, skipping"
    continue
  fi

  echo "==> ${triple}: downloading ${archive}"
  tmp="$(mktemp -d)"
  curl -fsSL "${BASE}/${archive}" -o "${tmp}/${archive}"

  if [[ "${archive}" == *.zip ]]; then
    unzip -q -o "${tmp}/${archive}" -d "${tmp}"
  else
    tar -xzf "${tmp}/${archive}" -C "${tmp}"
  fi

  found="$(find "${tmp}" -type f -name "${binary}" -print -quit)"
  if [[ -z "${found}" ]]; then
    echo "ERROR: ${binary} not found inside ${archive}" >&2
    exit 1
  fi

  mv "${found}" "${dest}/${binary}"
  chmod +x "${dest}/${binary}"
  rm -rf "${tmp}"
  echo "==> ${triple}: installed"
done

# Record checksums so a future fetch can be verified against a known-good set.
( cd "${PHP_DIR}" && find . -type f \( -name php -o -name php.exe \) -exec shasum -a 256 {} \; \
  | sort > checksums.txt )
echo "==> wrote checksums.txt"

# The macOS-native binary is the only one we can execute here; verify its
# extension set so a wrong build is caught now rather than at runtime.
NATIVE="${PHP_DIR}/darwin-$([[ "$(uname -m)" == "arm64" ]] && echo arm64 || echo x64)/php"
echo "==> verifying extensions on ${NATIVE}"
missing=""
for ext in ${REQUIRED_EXTS}; do
  if ! "${NATIVE}" -m | tr '[:upper:]' '[:lower:]' | grep -qx "${ext}"; then
    missing="${missing} ${ext}"
  fi
done

if [[ -n "${missing}" ]]; then
  echo "ERROR: static PHP is missing required extensions:${missing}" >&2
  echo "Build a custom binary with static-php-cli including all of: ${REQUIRED_EXTS}" >&2
  exit 1
fi

echo "==> all required extensions present"
```

- [ ] **Step 3: Run it**

Run: `cd desktop && chmod +x scripts/fetch-php.sh && npm run php:fetch`
Expected: three binaries installed, `checksums.txt` written, `all required extensions present`.

If the extension check fails, build a custom binary — static-php-cli's `common` combination does not always include `sqlite3` and `zip`:

```bash
./bin/spc build "fileinfo,iconv,mbstring,pdo,pdo_sqlite,sqlite3,tokenizer,zip,openssl,curl" --build-cli
```

- [ ] **Step 4: Verify the bundled PHP passes the smoke test**

Run: `cd desktop && PHP_BIN=./php/darwin-arm64/php npm run smoke`
Expected: `SMOKE TEST PASSED` — this is the real proof, since it exercises the actual shipped runtime rather than Homebrew PHP.

- [ ] **Step 5: Commit**

```bash
git add desktop/scripts/fetch-php.sh desktop/php/.gitignore desktop/php/checksums.txt
git commit -m "feat(desktop): add static php fetch script with extension verification"
```

---

### Task 4: Electron main process

**Files:**
- Create: `desktop/main.js`
- Create: `desktop/preload.js`

**Interfaces:**
- Consumes: `findFreePort`, `resolveDataDir`, `resolvePhpBinary`, `buildPhpArgs` from Task 1; `desktop/router.php` from Task 2; the PHP binaries from Task 3.

- [ ] **Step 1: Write the preload script**

Create `desktop/preload.js`. The renderer needs nothing from Node — the file exists so `contextIsolation` has a defined bridge point and future needs have somewhere to go.

```js
// Intentionally empty. The renderer talks to PHP over HTTP and needs no
// privileged APIs. Keeping the file means contextIsolation stays on with a
// defined (empty) bridge rather than no preload at all.
```

- [ ] **Step 2: Write `main.js`**

```js
import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync, accessSync, constants, statSync, renameSync } from 'node:fs'
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

let lastStderr = ''

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
    port = await findFreePort()
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
```

- [ ] **Step 3: Install dependencies and run it**

Run: `cd desktop && npm install && npm start`

Expected: a window opens showing the Connector Tester UI. Verify each of:
- The window appears with content already rendered — no white flash.
- `desktop/.dev-data/` was created, containing `sessions/`, `tmp/`, `logs/`, `chromium/`.
- `desktop/.dev-data/logs/php.log` exists.

- [ ] **Step 4: Verify no orphan process on quit**

Quit the app, then run: `pgrep -fl "php -d session.save_path" || echo "no orphan php"`
Expected: `no orphan php`

- [ ] **Step 5: Verify the failure path**

Temporarily rename the PHP binary and start again:

```bash
mv php/darwin-arm64/php php/darwin-arm64/php.bak && npm start
```

Expected: an error dialog naming the expected path, and the app quits rather than hanging. Then restore it: `mv php/darwin-arm64/php.bak php/darwin-arm64/php`

- [ ] **Step 6: Add `.dev-data` to gitignore and commit**

```bash
echo ".dev-data/" >> desktop/.gitignore
echo "node_modules/" >> desktop/.gitignore
echo "dist/" >> desktop/.gitignore
git add desktop/main.js desktop/preload.js desktop/.gitignore
git commit -m "feat(desktop): add electron main process with php lifecycle management"
```

---

### Task 5: Packaging — portable zips for macOS and Windows, both built on macOS

**Files:**
- Create: `desktop/electron-builder.yml`
- Create: `desktop/build/icon.icns`
- Create: `desktop/build/icon.ico`
- Modify: `desktop/package.json` (build scripts)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `desktop/dist/*.zip`

- [ ] **Step 1: Generate the icons from the existing favicon**

```bash
cd desktop && mkdir -p build
sips -s format png ../favicon.ico --out /tmp/icon.png
mkdir -p /tmp/icon.iconset
for s in 16 32 64 128 256 512; do
  sips -z $s $s /tmp/icon.png --out /tmp/icon.iconset/icon_${s}x${s}.png
done
iconutil -c icns /tmp/icon.iconset -o build/icon.icns
cp ../favicon.ico build/icon.ico
```

Expected: `build/icon.icns` and `build/icon.ico` exist. If `favicon.ico` is too low-resolution, electron-builder will warn — a 512×512 source PNG is preferable if one is available.

- [ ] **Step 2: Write the electron-builder config**

Create `desktop/electron-builder.yml`. `extraResources` stages the PHP app so `process.resourcesPath` matches what `main.js` expects, and `asar: false` is unnecessary here because PHP reads from `extraResources`, not from the asar archive.

```yaml
appId: de.jtl.connector-tester
productName: JTL Connector Tester
copyright: JTL-Software GmbH

directories:
  output: dist
  buildResources: build

files:
  - main.js
  - preload.js
  - lib/**/*
  - package.json

extraResources:
  - from: ../src
    to: src
  - from: ../vendor
    to: vendor
  - from: ../public
    to: public
  - from: ../composer.json
    to: composer.json
  - from: router.php
    to: router.php
  - from: php/${platform}-${arch}
    to: php/${platform}-${arch}

mac:
  target:
    - target: zip
      arch: [arm64, x64]
  category: public.app-category.developer-tools
  icon: build/icon.icns

win:
  target:
    - target: zip
      arch: [x64]
  icon: build/icon.ico

artifactName: JTL-Connector-Tester-${version}-${os}-${arch}.${ext}
```

- [ ] **Step 3: Add the build scripts**

Modify `desktop/package.json` — replace the `scripts` block:

```json
  "scripts": {
    "test": "node --test lib/",
    "start": "electron .",
    "php:fetch": "./scripts/fetch-php.sh",
    "smoke": "node scripts/smoke.js",
    "prebuild": "cd .. && composer install --no-dev --optimize-autoloader && cd frontend && npm ci && npm run build",
    "build:mac": "npm run prebuild && electron-builder --mac zip --arm64 --x64",
    "build:win": "npm run prebuild && electron-builder --win zip --x64"
  },
```

- [ ] **Step 4: Build the macOS zips**

Run: `cd desktop && npm run build:mac`
Expected: `dist/JTL-Connector-Tester-1.0.0-mac-arm64.zip` and `-mac-x64.zip`, roughly 150–200 MB each.

- [ ] **Step 5: Build the Windows zip on macOS**

Run: `cd desktop && npm run build:win`
Expected: `dist/JTL-Connector-Tester-1.0.0-win-x64.zip`

**Wine is not required.** This was verified before the plan was written: on a machine with no wine installed, electron-builder 26.15.3 produced a Windows x64 zip from macOS with exit code 0, custom `.ico` included — the packaged `.exe` grew by 75,776 bytes versus an iconless build, and the icon's image bytes were found inside the executable. electron-builder patches the exe natively rather than shelling out to `rcedit` under wine. The upstream wine requirement applies to NSIS installers, which this project does not build.

Confirm the icon actually applied: the build log must **not** contain `default Electron icon is used`. If it does, `win.icon` is not resolving — check that `build/icon.ico` exists and the path in `electron-builder.yml` is relative to `desktop/`.

- [ ] **Step 6: Verify the packaged macOS app end to end**

```bash
cd dist && rm -rf verify && mkdir verify && cd verify
unzip -q "../JTL-Connector-Tester-1.0.0-mac-arm64.zip"
open "JTL Connector Tester.app"
```

Verify each of:
- The app launches and shows the UI.
- `dist/verify/data/` appeared **beside** the `.app`, not inside it.
- `data/chromium/`, `data/sessions/`, `data/logs/php.log` all exist.
- Save a connection, quit, relaunch — the connection is still there.
- Copy the whole `verify/` folder elsewhere and launch it — the connection came along.
- Quit, then `pgrep -fl "php -d session.save_path"` prints nothing.

- [ ] **Step 7: Verify it works with no network**

Turn off Wi-Fi, relaunch the packaged app, and confirm the UI still renders fully. This catches any runtime CDN dependency.

- [ ] **Step 8: Commit**

```bash
git add desktop/electron-builder.yml desktop/build/ desktop/package.json
git commit -m "feat(desktop): add portable zip packaging for macos and windows"
```

---

### Task 6: Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: the verified build procedure from Task 5.

- [ ] **Step 1: Add a Desktop App section to `README.md`**

Insert after the existing "How to install locally" section. Replace the bracketed note in the Windows step with whichever path actually worked in Task 5, Step 5.

````markdown
## Desktop App (macOS & Windows)

The desktop app bundles its own PHP runtime, so nothing needs to be installed —
no PHP, no Composer, no Node. It can reach connectors running on `localhost`,
which the hosted tester at tester.jtl-connector.de cannot, and it works offline.

### Install

1. Download the zip for your platform from the releases page.
2. Extract it anywhere you like — there is no installer.
3. **macOS only:** if you downloaded the zip through a browser, macOS quarantines
   it. Clear the flag once:

   ```bash
   xattr -dr com.apple.quarantine "JTL Connector Tester.app"
   ```

   Without this you get "the app is damaged and can't be opened". The builds are
   deliberately unsigned; this is expected.
4. Launch the app.

### Your data

Saved connections, request history, and saved payloads live in a `data/` folder
**next to the app** — beside the `.app` on macOS, beside the `.exe` on Windows.
The app is fully portable: copy the extracted folder to a USB stick and your
connections come with it. Delete `data/` to reset to a clean state.

Extract somewhere writable. If you extract into a read-only location the app
will tell you rather than silently losing data.

### Building from source

Requires macOS. Both platforms are built on a Mac.

```bash
cd desktop
npm install
npm run php:fetch     # downloads static PHP binaries, verifies extensions
npm run build:mac     # -> dist/JTL-Connector-Tester-<version>-mac-{arm64,x64}.zip
npm run build:win     # -> dist/JTL-Connector-Tester-<version>-win-x64.zip
```

Both platforms build on a Mac with no extra tooling — wine is **not** required.
electron-builder patches the Windows executable natively. (Wine would only be
needed if an NSIS installer target were added, which this project deliberately
avoids in favour of portable zips.)

Useful during development:

```bash
npm start             # run unpackaged against system PHP
npm test              # unit tests for path/port/arg helpers
npm run smoke         # boot PHP headless and assert the API responds
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document the desktop app, portable data, and build process"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Architecture — PHP serves SPA + API on loopback | 2, 4 |
| `desktop/router.php` | 2 |
| Repository layout | 1–5 |
| Bundled PHP runtime + required extensions | 3 |
| Portable data, per-platform paths | 1 (logic + tests), 4 (wiring), 5 (verification) |
| Boot sequence, all 6 steps | 4 |
| Error handling table, all 5 rows | 4 |
| Renderer security | 4 |
| Build scripts, zip-only, built on macOS | 5 |
| Testing — unit, smoke, manual checklist | 1, 2, 5 |
| Documentation incl. quarantine note | 6 |
| Open item: does Windows need wine? | **Resolved before implementation — no.** Verified empirically; recorded in 5 Step 5 and 6 |

**Type consistency:** `resolveDataDir`, `resolvePhpBinary`, `buildPhpArgs`, and `findFreePort` keep identical signatures across Tasks 1, 2, and 4. `dataDir` is the portable root everywhere; Chromium's store is a `chromium/` subdirectory of it, set once in `main.js`.

**Deviation from spec, deliberate:** the spec says `app.setPath('userData', dataDir)`. The plan uses `path.join(dataDir, 'chromium')` so Chromium's cache files do not intermingle with `sessions/`, `tmp/`, and `logs/`. The portable guarantee is unchanged — everything still sits under `data/`.

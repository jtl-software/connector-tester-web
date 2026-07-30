# Desktop App (Electron + bundled static PHP) — Design

**Date:** 2026-07-30
**Status:** Approved
**Scope:** Ship the JTL Connector Tester as portable macOS and Windows desktop applications.

## Problem

The hosted tester at `tester.jtl-connector.de` cannot test connectors that run on a
developer's own machine: the server has no route to `http://localhost/...` on a client
box, and an HTTPS page cannot call an HTTP endpoint without mixed-content errors.
Running the tester locally instead requires installing PHP 8.2, Composer, and Node,
then pointing a vhost at `public/` — too much friction to hand to a colleague or partner.

## Goals

- A double-click application that reaches connectors on `localhost` and on the LAN.
- No PHP, Composer, or Node installation on the user's machine.
- Works fully offline.
- Distributed as a **portable zip** — extract and run, no installer.
- macOS and Windows.

## Non-Goals

Auto-update. Code signing and notarization. A Linux target. Native menus beyond
Electron's default. Any change to the web deployment or `.gitlab-ci.yml`. CI-produced
builds — releases are cut manually with local scripts.

## Why Electron and not NativePHP

NativePHP for Desktop requires PHP 8.3+, **Laravel 11+**, and Node 22+. This
application is Slim 4. Adopting NativePHP therefore means first porting `Kernel.php`
and five controllers to Laravel routing and DI, adding roughly 50 MB of Laravel
vendor code, and then either maintaining two backends or migrating the production
web app to Laravel as well. The payoff would be native OS APIs and auto-updates,
neither of which this tool needs. For a 1,100-line RPC proxy the port cost is not repaid.

Reimplementing the proxy in Node and dropping PHP entirely was also rejected:
`getSkeleton` and `generatePayload` depend on `jtl/connector-core`'s model classes via
JMS Serializer and fakerphp. Reproducing that in Node would duplicate connector-core's
model surface and require re-syncing it on every core release.

## Architecture

The Electron main process spawns a bundled **static PHP CLI binary** running PHP's
built-in web server on a random free port bound to `127.0.0.1`, with `public/` as the
document root. The `BrowserWindow` loads `http://127.0.0.1:<port>/`.

PHP already serves the SPA (`GET /` returns `public/frontend/index.html`) as well as the
API. Serving both from one origin means:

- The frontend's relative axios calls (`/authenticate`, `/Pull`, …) resolve correctly.
- `axios.defaults.withCredentials` and `session_start()` work unchanged.
- The `Access-Control-Allow-Origin: http://localhost:5173` middleware becomes a
  harmless no-op.

**`src/` and `frontend/` require no changes.** The desktop target is purely additive.

### New PHP file

`php -S` serves files that exist under the document root but sends everything else to
the router script. `public/index.php` cannot serve as the router because it never
returns `false`, so asset requests would reach Slim and 404. `desktop/router.php`:

```php
<?php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path !== '/' && is_file(__DIR__ . '/public' . $path)) {
    return false;
}
require __DIR__ . '/public/index.php';
```

Vite emits `base: '/../frontend'`, which browsers normalise to `/frontend/`, so built
assets are requested at `/frontend/assets/…` and resolve against `public/frontend/assets/…`.

## Repository layout

All new code lives under `desktop/`:

```
desktop/
  package.json            electron + electron-builder, build scripts
  electron-builder.yml    zip-only targets, extraResources staging
  main.js                 boot sequence, window, lifecycle
  preload.js              contextIsolation bridge (minimal)
  lib/
    data-dir.js           per-platform portable path resolution
    free-port.js          bind port 0, read, release
    php-args.js           build php argv and -d ini overrides
  php/
    darwin-arm64/php
    darwin-x64/php
    win32-x64/php.exe
  router.php
  scripts/fetch-php.sh    download + checksum static PHP binaries
  build/
    icon.icns
    icon.ico
```

## Bundled PHP runtime

Static PHP binaries are produced by `static-php-cli` and must include the extensions
required by `composer.lock`, plus those needed at runtime:

`fileinfo`, `iconv`, `json`, `mbstring`, `pdo`, `sqlite3`, `tokenizer`, `zip`,
`session`, `openssl`, `curl`.

`scripts/fetch-php.sh` downloads the binaries into `desktop/php/<platform>/` and
verifies a pinned SHA-256 checksum before use. The binaries are not committed to git;
the checksums and download URLs are.

Approximate packaged size: ~110 MB Electron + ~35 MB static PHP + ~20 MB vendor
≈ **~165 MB per zip**.

## Portable data — "beside the app"

`app.setPath('userData', dataDir)` is called **before** `app.whenReady()`. This
relocates Chromium's `localStorage` — where saved connector credentials live — into
`dataDir`. PHP receives `-d session.save_path=<dataDir>/sessions` and
`-d sys_temp_dir=<dataDir>/tmp`.

Platform resolution differs and is the most likely place for a bug, so it is isolated
in `lib/data-dir.js` and unit-tested:

| Platform | `dataDir` | Rationale |
|---|---|---|
| Windows | `<dir of .exe>/data` | Sibling of the executable inside the extracted folder. |
| macOS | `<dir containing the .app>/data` — i.e. `dirname(app.getPath('exe')) + '/../../../data'` | A sibling of the `.app` bundle, **not** inside it. Writing inside the bundle would be invisible to the user and fragile. A sibling folder means copying the extracted folder to a USB stick carries saved connections with it. |

If `dataDir` is not writable, the app shows a dialog naming the path and quits rather
than silently losing credentials.

## Boot sequence

1. Resolve `dataDir`, create it, verify it is writable.
2. Pick a free port: listen on `127.0.0.1:0`, read the assigned port, close.
3. Spawn `php -S 127.0.0.1:<port> -t <res>/public <res>/router.php` with the ini
   overrides above. Loopback-only — nothing is exposed on the LAN.
4. Poll `GET /` until it returns 200, with a 15 s timeout.
5. Show the window (hidden until ready, so there is no white flash) and load the URL.
6. On quit, send `SIGTERM` to the child, then `SIGKILL` after 2 s. No orphan `php`
   processes.

## Error handling

Each failure produces a specific dialog rather than a silent hang:

| Failure | Behaviour |
|---|---|
| PHP binary missing or not executable | Dialog naming the expected path; quit. |
| Port bind failure | Retry up to 3× with a new port, then dialog; quit. |
| Readiness timeout (15 s) | Dialog including the tail of PHP's stderr; quit. |
| PHP exits while the app is running | Dialog offering *Restart backend* or *Quit*. |
| `dataDir` not writable | Dialog naming the path; quit. |

All PHP stdout and stderr is tee'd to `<dataDir>/logs/php.log`, rotated at 5 MB.

## Renderer security

`contextIsolation: true`, `nodeIntegration: false`. Navigation away from
`127.0.0.1:<port>` is blocked via `will-navigate`; external links are opened in the
system browser via `setWindowOpenHandler`.

## Build scripts

```
npm run php:fetch     # static PHP binaries -> desktop/php/, checksum-verified
npm run build:mac     # -> JTL-Connector-Tester-<ver>-mac-arm64.zip (+ x64)
npm run build:win     # -> JTL-Connector-Tester-<ver>-win-x64.zip
```

Each build runs `composer install --no-dev --optimize-autoloader`, builds the Vite
frontend, stages `src/`, `vendor/`, `public/`, `router.php`, and `php/<target>/` as
`extraResources`, then invokes `electron-builder` with **`zip` as the only target**.
Excluded from staging: `frontend/node_modules`, `.git`, `core`, `shopify-connector`.

Both targets can be built from macOS. The Windows `zip` target does not require wine
the way an NSIS installer would, but `rcedit` — which stamps the icon and version onto
the `.exe` — does want wine on macOS. **Open item to resolve during implementation:**
confirm whether `wine-stable` is needed; if so, document `brew install --cask
wine-stable`, and fall back to building the Windows zip on a Windows machine with the
same script if wine proves unreliable.

## Testing

`lib/data-dir.js`, `lib/free-port.js`, and `lib/php-args.js` are pure functions covered
by `node:test` unit tests. Platform-specific path resolution gets the most attention.

`npm run smoke` spawns the PHP server exactly as `main.js` does, asserts `GET /`
returns 200 with the SPA shell and `POST /authenticate` returns JSON, then tears down
and asserts no surviving child process. This runs headless and catches nearly all
integration breakage without launching Electron.

A manual checklist in the README covers the packaged build: launch from a fresh
extract; save a connection; quit; relaunch; confirm it persisted; confirm `data/`
appeared beside the app; confirm no stray `php` process remains.

## Documentation

The README gains a "Desktop app" section covering: download and extract, the macOS
`xattr -dr com.apple.quarantine` step for zips downloaded through a browser, where
`data/` lives, and how to build from source.

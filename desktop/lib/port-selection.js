import { readFileSync, writeFileSync } from 'node:fs'
import net from 'node:net'

import { findFreePort } from './free-port.js'

/**
 * Fixed default port for the bundled PHP backend.
 *
 * mainWindow.loadURL points at http://127.0.0.1:<port>/, and Chromium's
 * localStorage/IndexedDB (where the frontend keeps saved connections,
 * history, and saved payloads) is partitioned by full origin, port included.
 *
 * The original design picked a random port on first launch and persisted it
 * in `.port` so restarts would land on the same origin — but that made
 * `.port` the *only* thing standing between the user and total data loss:
 * lose that one file (accidental delete, disk hiccup, a `data/` folder
 * copied over from a different install) and the next launch picked a fresh
 * random port, silently orphaning every saved connection under the old,
 * now-unreachable origin. QA reproduced exactly this by deleting
 * `data/.port` and relaunching.
 *
 * Fix: always try this fixed port FIRST, on every launch, regardless of
 * what (if anything) `.port` contains. A missing or corrupt `.port` then
 * still resolves to the same origin, because "the default" is a constant,
 * not "whatever we happened to pick last time". `.port` is now only a
 * memory of the last *fallback* port — used across relaunches only on
 * machines where the default is genuinely unavailable (something else is
 * bound to it) — so losing it degrades gracefully instead of being a single
 * point of failure for the user's whole connection list.
 *
 * 47831 sits in IANA's user/registered range (1024-49151), i.e. it avoids
 * the 49152-65535 dynamic/ephemeral range OSes hand out for short-lived
 * outgoing connections (which would make collisions likelier over time), and
 * it doesn't collide with common dev-server ports (3000, 5173, 8000, 8080,
 * 9000, ...) or any well-known service port.
 */
export const DEFAULT_PORT = 47831

export function isValidPort(value) {
  return Number.isInteger(value) && value >= 1024 && value <= 65535
}

export function isPortFree(candidate, host) {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.listen(candidate, host, () => srv.close(() => resolve(true)))
  })
}

function writePortFile(portFile, value) {
  try {
    writeFileSync(portFile, String(value))
  } catch {
    // non-fatal — worst case we pick a fresh port again next launch
  }
}

/**
 * Pick the port the bundled PHP server should bind to.
 *
 * Always tries `defaultPort` first. Only if that is genuinely unavailable
 * does it fall back — preferring the fallback port recorded from a previous
 * launch (if it is still free) before resorting to an OS-assigned random
 * port — and records whichever fallback it picked in `portFile` so repeated
 * launches on a machine where the default stays occupied still land on one
 * stable origin instead of a new one every time.
 *
 * `defaultPort` defaults to the real `DEFAULT_PORT` for production use, but
 * is injectable so tests can exercise the "default is occupied" path against
 * a throwaway ephemeral port they own instead of binding the real fixed
 * default — binding 47831 in a test suite means the suite spuriously fails
 * for any developer who happens to have the actual app running (N6).
 */
export async function pickPort(host, portFile, defaultPort = DEFAULT_PORT) {
  if (await isPortFree(defaultPort, host)) {
    writePortFile(portFile, defaultPort)
    return defaultPort
  }

  let previousFallback = null
  try {
    const raw = parseInt(readFileSync(portFile, 'utf8'), 10)
    if (isValidPort(raw) && raw !== defaultPort) previousFallback = raw
  } catch {
    // no previous fallback recorded — first time the default port was busy
  }

  const chosen = (previousFallback && (await isPortFree(previousFallback, host)))
    ? previousFallback
    : await findFreePort(host)

  writePortFile(portFile, chosen)
  return chosen
}

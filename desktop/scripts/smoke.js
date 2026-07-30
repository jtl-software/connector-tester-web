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
    // The real frontend talks to this API through axios, which sends this
    // Accept header by default. Slim's error middleware negotiates HTML vs
    // JSON off the Accept header, so without it a thrown exception (e.g. the
    // bogus connector URL below) would render as an HTML error page instead
    // of JSON, even though the app behaves correctly for real requests.
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json, text/plain, */*'
    },
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

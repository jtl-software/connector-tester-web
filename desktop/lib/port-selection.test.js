import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { DEFAULT_PORT, isValidPort, pickPort } from './port-selection.js'

const HOST = '127.0.0.1'

function withTmpDir(fn) {
  const dir = mkdtempSync(path.join(tmpdir(), 'port-selection-test-'))
  return Promise.resolve(fn(path.join(dir, '.port'))).finally(() => {
    rmSync(dir, { recursive: true, force: true })
  })
}

/** Bind a real listening socket on `port` and keep it open until closed. */
function occupy(port, host = HOST) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(port, host, () => resolve(srv))
  })
}

test('isValidPort accepts the documented range and rejects everything else', () => {
  assert.equal(isValidPort(1024), true)
  assert.equal(isValidPort(65535), true)
  assert.equal(isValidPort(47831), true)
  assert.equal(isValidPort(1023), false)
  assert.equal(isValidPort(65536), false)
  assert.equal(isValidPort(99999), false)
  assert.equal(isValidPort(-1), false)
  assert.equal(isValidPort(0), false)
  assert.equal(isValidPort(NaN), false)
  assert.equal(isValidPort(80.5), false)
})

test('uses the fixed default port on a first launch (no .port file yet)', () =>
  withTmpDir(async (portFile) => {
    const chosen = await pickPort(HOST, portFile)
    assert.equal(chosen, DEFAULT_PORT)
    assert.equal(readFileSync(portFile, 'utf8'), String(DEFAULT_PORT))
  })
)

// This is the regression QA hit: deleting data/.port used to make the app
// pick a brand-new random port, changing the renderer's origin and orphaning
// every saved connection. The fixed default must win regardless of what (if
// anything) is in the port file.
test('still lands on the default port when .port is missing entirely', () =>
  withTmpDir(async (portFile) => {
    // portFile was created by mkdtempSync's dir but the file itself was
    // never written — this simulates a deleted/never-created `.port`.
    const chosen = await pickPort(HOST, portFile)
    assert.equal(chosen, DEFAULT_PORT)
  })
)

test('still lands on the default port when .port contains garbage or an out-of-range value', () =>
  withTmpDir(async (portFile) => {
    writeFileSync(portFile, 'not-a-port')
    assert.equal(await pickPort(HOST, portFile), DEFAULT_PORT)

    writeFileSync(portFile, '99999')
    assert.equal(await pickPort(HOST, portFile), DEFAULT_PORT)

    writeFileSync(portFile, '-1')
    assert.equal(await pickPort(HOST, portFile), DEFAULT_PORT)
  })
)

test('falls back to a fresh free port when the default is genuinely occupied, and records it', () =>
  withTmpDir(async (portFile) => {
    const blocker = await occupy(DEFAULT_PORT)
    try {
      const chosen = await pickPort(HOST, portFile)
      assert.notEqual(chosen, DEFAULT_PORT)
      assert.ok(isValidPort(chosen))
      assert.equal(readFileSync(portFile, 'utf8'), String(chosen))
    } finally {
      await new Promise((resolve) => blocker.close(resolve))
    }
  })
)

test('reuses the recorded fallback port across launches while the default stays occupied', () =>
  withTmpDir(async (portFile) => {
    const blocker = await occupy(DEFAULT_PORT)
    try {
      const first = await pickPort(HOST, portFile)
      const second = await pickPort(HOST, portFile)
      assert.equal(second, first)
      assert.notEqual(second, DEFAULT_PORT)
    } finally {
      await new Promise((resolve) => blocker.close(resolve))
    }
  })
)

test('recovers the default port once it frees up again, even if a fallback was recorded', () =>
  withTmpDir(async (portFile) => {
    const blocker = await occupy(DEFAULT_PORT)
    const fallback = await pickPort(HOST, portFile)
    assert.notEqual(fallback, DEFAULT_PORT)
    await new Promise((resolve) => blocker.close(resolve))

    const chosen = await pickPort(HOST, portFile)
    assert.equal(chosen, DEFAULT_PORT)
  })
)

import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { DEFAULT_PORT, isValidPort, pickPort } from './port-selection.js'
import { findFreePort } from './free-port.js'

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

// These tests exercise pickPort's logic against an ephemeral port the test
// itself owns (obtained fresh from the OS via findFreePort), passed in as the
// `defaultPort` override — never against the real, fixed DEFAULT_PORT
// (47831). Binding the real default here would make the whole suite fail any
// time a developer (or a packaged build) happens to have the actual app
// running and holding that port — exactly what happened during this fix wave
// (N6). The only thing asserted about the real DEFAULT_PORT is its value and
// validity, which requires no socket at all.
test('DEFAULT_PORT is the documented fixed value and is itself a valid port', () => {
  assert.equal(DEFAULT_PORT, 47831)
  assert.equal(isValidPort(DEFAULT_PORT), true)
})

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
    const fakeDefault = await findFreePort(HOST)
    const chosen = await pickPort(HOST, portFile, fakeDefault)
    assert.equal(chosen, fakeDefault)
    assert.equal(readFileSync(portFile, 'utf8'), String(fakeDefault))
  })
)

// This is the regression QA hit: deleting data/.port used to make the app
// pick a brand-new random port, changing the renderer's origin and orphaning
// every saved connection. The fixed default must win regardless of what (if
// anything) is in the port file.
test('still lands on the default port when .port is missing entirely', () =>
  withTmpDir(async (portFile) => {
    const fakeDefault = await findFreePort(HOST)
    // portFile was created by mkdtempSync's dir but the file itself was
    // never written — this simulates a deleted/never-created `.port`.
    const chosen = await pickPort(HOST, portFile, fakeDefault)
    assert.equal(chosen, fakeDefault)
  })
)

test('still lands on the default port when .port contains garbage or an out-of-range value', () =>
  withTmpDir(async (portFile) => {
    const fakeDefault = await findFreePort(HOST)

    writeFileSync(portFile, 'not-a-port')
    assert.equal(await pickPort(HOST, portFile, fakeDefault), fakeDefault)

    writeFileSync(portFile, '99999')
    assert.equal(await pickPort(HOST, portFile, fakeDefault), fakeDefault)

    writeFileSync(portFile, '-1')
    assert.equal(await pickPort(HOST, portFile, fakeDefault), fakeDefault)
  })
)

test('falls back to a fresh free port when the default is genuinely occupied, and records it', () =>
  withTmpDir(async (portFile) => {
    const fakeDefault = await findFreePort(HOST)
    const blocker = await occupy(fakeDefault)
    try {
      const chosen = await pickPort(HOST, portFile, fakeDefault)
      assert.notEqual(chosen, fakeDefault)
      assert.ok(isValidPort(chosen))
      assert.equal(readFileSync(portFile, 'utf8'), String(chosen))
    } finally {
      await new Promise((resolve) => blocker.close(resolve))
    }
  })
)

test('reuses the recorded fallback port across launches while the default stays occupied', () =>
  withTmpDir(async (portFile) => {
    const fakeDefault = await findFreePort(HOST)
    const blocker = await occupy(fakeDefault)
    try {
      const first = await pickPort(HOST, portFile, fakeDefault)
      const second = await pickPort(HOST, portFile, fakeDefault)
      assert.equal(second, first)
      assert.notEqual(second, fakeDefault)
    } finally {
      await new Promise((resolve) => blocker.close(resolve))
    }
  })
)

test('recovers the default port once it frees up again, even if a fallback was recorded', () =>
  withTmpDir(async (portFile) => {
    const fakeDefault = await findFreePort(HOST)
    const blocker = await occupy(fakeDefault)
    const fallback = await pickPort(HOST, portFile, fakeDefault)
    assert.notEqual(fallback, fakeDefault)
    await new Promise((resolve) => blocker.close(resolve))

    const chosen = await pickPort(HOST, portFile, fakeDefault)
    assert.equal(chosen, fakeDefault)
  })
)

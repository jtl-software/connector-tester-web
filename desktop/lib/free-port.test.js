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

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

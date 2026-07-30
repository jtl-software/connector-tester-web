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

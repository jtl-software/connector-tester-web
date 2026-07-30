import { describe, it, expect, beforeEach } from 'vitest'
import { loadConnections, saveConnections, migrateLegacyConnections, CONNECTIONS_KEY } from './connections'

beforeEach(() => localStorage.clear())

describe('connection storage', () => {
  it('round-trips connections', () => {
    saveConnections([{ name: 'shop-dev', url: 'http://x', token: 't' }])
    expect(loadConnections()).toEqual([{ name: 'shop-dev', url: 'http://x', token: 't' }])
  })

  it('returns an empty list when nothing is stored', () => {
    expect(loadConnections()).toEqual([])
  })

  it('imports legacy flat keys written by the Vue app', () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    localStorage.setItem('shop-prod', JSON.stringify({ url: 'http://b', token: 'b1' }))

    const imported = migrateLegacyConnections()

    expect(imported).toBe(2)
    const names = loadConnections().map((c) => c.name).sort()
    expect(names).toEqual(['shop-dev', 'shop-prod'])
  })

  it('leaves legacy keys in place so a rollback still works', () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    migrateLegacyConnections()
    expect(localStorage.getItem('shop-dev')).not.toBeNull()
  })

  it('ignores keys that are not connection-shaped', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('some-flag', JSON.stringify({ enabled: true }))
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))

    expect(migrateLegacyConnections()).toBe(1)
    expect(loadConnections().map((c) => c.name)).toEqual(['shop-dev'])
  })

  it('does not run twice over the same data', () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    migrateLegacyConnections()
    expect(migrateLegacyConnections()).toBe(0)
    expect(loadConnections()).toHaveLength(1)
  })

  it('never clobbers connections that already exist', () => {
    saveConnections([{ name: 'kept', url: 'http://kept', token: 'k' }])
    localStorage.setItem('legacy', JSON.stringify({ url: 'http://l', token: 'l' }))

    migrateLegacyConnections()

    expect(loadConnections().map((c) => c.name).sort()).toEqual(['kept'])
  })

  it('survives corrupt stored JSON without throwing', () => {
    localStorage.setItem(CONNECTIONS_KEY, '{not json')
    expect(loadConnections()).toEqual([])
  })
})

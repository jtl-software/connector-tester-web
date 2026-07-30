import { describe, it, expect, beforeEach } from 'vitest'
import { loadPayloads, savePayloads, visiblePayloads, type SavedPayload } from './payloads'

function payload(over: Partial<SavedPayload> = {}): SavedPayload {
  return { id: '1', name: 'p', controller: 'category', body: '{}', updatedAt: 1, ...over }
}

beforeEach(() => { localStorage.clear() })

describe('payloads storage', () => {
  it('round-trips through localStorage', () => {
    savePayloads([payload({ name: 'kept', connectionName: 'a' })])
    expect(loadPayloads()).toEqual([payload({ name: 'kept', connectionName: 'a' })])
  })
})

describe('visiblePayloads', () => {
  it('returns nothing when no connection is selected', () => {
    expect(visiblePayloads([payload({ connectionName: 'a' })], null)).toEqual([])
  })

  it('only returns payloads for the active connection', () => {
    const a = payload({ id: '1', connectionName: 'a' })
    const b = payload({ id: '2', connectionName: 'b' })
    expect(visiblePayloads([a, b], 'a')).toEqual([a])
  })

  it('shows legacy payloads (missing connectionName) under every connection', () => {
    const legacy = payload({ id: '1' })
    delete (legacy as Partial<SavedPayload>).connectionName
    expect(visiblePayloads([legacy], 'a')).toEqual([legacy])
    expect(visiblePayloads([legacy], 'b')).toEqual([legacy])
  })
})

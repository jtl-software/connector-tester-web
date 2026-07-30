import { describe, it, expect, afterEach, vi } from 'vitest'
import { newId } from './id'

const V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('newId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a valid v4 UUID when crypto.randomUUID is present', () => {
    const id = newId()
    expect(id).toMatch(V4_RE)
  })

  it('still returns a valid, unique v4 UUID when crypto.randomUUID is undefined (insecure context)', () => {
    // Simulate the exact condition from the bug report: crypto.randomUUID is
    // undefined (as in a non-secure-context browser tab) while
    // crypto.getRandomValues remains available.
    //
    // Note: `randomUUID` lives on `Crypto.prototype`, not as an own property
    // of the `crypto` object, so a plain `delete crypto.randomUUID` is a
    // no-op (the lookup just falls through to the prototype again). We have
    // to shadow it with an own property set to `undefined` instead.
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    expect(typeof crypto.randomUUID).toBe('undefined')

    try {
      const a = newId()
      const b = newId()
      expect(a).toMatch(V4_RE)
      expect(b).toMatch(V4_RE)
      expect(a).not.toBe(b)
    } finally {
      // @ts-expect-error -- removing the shadowing own property restores
      // access to the real Crypto.prototype.randomUUID
      delete crypto.randomUUID
    }
  })

  it('falls back to a non-throwing unique id when crypto itself is unavailable', () => {
    const originalCrypto = globalThis.crypto
    // @ts-expect-error -- simulating an environment with no Web Crypto at all
    delete globalThis.crypto

    try {
      const a = newId()
      const b = newId()
      expect(typeof a).toBe('string')
      expect(a.length).toBeGreaterThan(0)
      expect(a).not.toBe(b)
    } finally {
      globalThis.crypto = originalCrypto
    }
  })
})

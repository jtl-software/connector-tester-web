/**
 * `crypto.randomUUID()` is only exposed in secure contexts (HTTPS, or origins
 * Chromium treats as "potentially trustworthy" like http://127.0.0.1 /
 * http://localhost). The desktop app happens to run on http://127.0.0.1, so
 * it never notices — but this tester is also served over plain HTTP on LAN
 * hostnames (e.g. Laravel Herd `.test` domains), where `crypto.randomUUID`
 * is `undefined` and calling it throws `TypeError: crypto.randomUUID is not
 * a function`.
 *
 * `crypto.getRandomValues()`, by contrast, is NOT gated behind a secure
 * context and is available everywhere `crypto` exists. So we feature-detect
 * `randomUUID` directly (never branch on `window.isSecureContext` — that's
 * an indirect proxy for the thing we actually care about, whether the
 * function exists) and fall back to building an RFC 4122 v4 UUID by hand
 * from `getRandomValues()` when it's missing.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    // Set the version (4) and variant (10xx) bits per RFC 4122 section 4.4.
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  // Last-resort fallback if `crypto` itself is unavailable. This is NOT
  // cryptographically strong and must never be used for anything security
  // sensitive — but the ids here are local record ids (history entries,
  // saved payloads), where uniqueness-in-practice matters, not unguessability.
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

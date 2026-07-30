import type { Connection } from '@/types/domain'

export const CONNECTIONS_KEY = 'jtl.connections'

export function loadConnections(): Connection[] {
  try {
    const raw = localStorage.getItem(CONNECTIONS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Connection[]) : []
  } catch {
    return []
  }
}

export function saveConnections(list: Connection[]): void {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(list))
}

function isLegacyConnection(value: unknown): value is { url: string; token: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.url === 'string' && typeof v.token === 'string'
}

/**
 * The Vue app stored each connection as a bare localStorage key whose value was
 * {url, token} — it treated every key in localStorage as a connection. Import
 * those once, and deliberately leave the originals alone so downgrading to the
 * Vue build does not lose them.
 *
 * Returns the number of connections imported.
 */
export function migrateLegacyConnections(): number {
  // Guard on key *absence*, not "the list is empty". Deleting every saved
  // connection writes "[]" via saveConnections(), which is a present key
  // with length 0 — checking length would re-run the migration on every
  // subsequent reload and resurrect connections the user deliberately
  // deleted.
  if (localStorage.getItem(CONNECTIONS_KEY) !== null) return 0

  const imported: Connection[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || key.startsWith('jtl.')) continue

    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '')
      if (isLegacyConnection(parsed)) {
        imported.push({ name: key, url: parsed.url, token: parsed.token })
      }
    } catch {
      // not JSON — not a connection
    }
  }

  if (imported.length > 0) saveConnections(imported)
  return imported.length
}

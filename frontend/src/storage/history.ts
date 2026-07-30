import type { ControllerName } from '@/types/domain'

export const DB_NAME = 'jtl-tester'
export const STORE = 'history'
export const HISTORY_LIMIT = 100
export const MAX_RESPONSE_BYTES = 512 * 1024

export interface HistoryEntry {
  id: string
  at: number
  connectionName: string
  controller: ControllerName | string
  action: string
  payload: string
  limit: number
  status: 'ok' | 'error'
  httpStatus: number
  durationMs: number
  response: unknown
  responseBytes: number
  truncated: boolean
  /** User-supplied rename. When unset, the rail falls back to `controller · action`. */
  label?: string
}

/**
 * History is scoped per connection (see HISTORY_LIMIT / appendHistory below),
 * so the rail must only ever show entries for the connection that's active.
 * Unlike SavedPayload, every HistoryEntry has always had a `connectionName` —
 * there's no legacy/undefined case to special-case here.
 */
export function visibleHistory(history: HistoryEntry[], connectionName: string | null): HistoryEntry[] {
  if (!connectionName) return []
  return history.filter((e) => e.connectionName === connectionName)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('at', 'at')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      })
  )
}

/** Keep the DB bounded: huge responses are stored as a truncated string. */
function capResponse(entry: HistoryEntry): HistoryEntry {
  const serialised = JSON.stringify(entry.response ?? null)
  if (serialised.length <= MAX_RESPONSE_BYTES) return entry

  return {
    ...entry,
    response: `${serialised.slice(0, MAX_RESPONSE_BYTES)}… [truncated]`,
    truncated: true
  }
}

/**
 * HISTORY_LIMIT is a per-connection cap, not a global one. Trimming the
 * *global* newest-100 (the original behaviour) meant a busy connector could
 * silently evict a quiet connector's entire history — which would defeat
 * per-connector history scoping. `loadHistory()` returns newest-first, so
 * filtering to just this entry's connection before slicing keeps the newest
 * HISTORY_LIMIT entries *for that connection* and leaves every other
 * connection's entries untouched.
 */
export async function appendHistory(entry: HistoryEntry): Promise<void> {
  await tx('readwrite', (store) => store.put(capResponse(entry)))

  const all = await loadHistory()
  const sameConnection = all.filter((h) => h.connectionName === entry.connectionName)
  if (sameConnection.length <= HISTORY_LIMIT) return

  const doomed = sameConnection.slice(HISTORY_LIMIT)
  for (const old of doomed) {
    await tx('readwrite', (store) => store.delete(old.id))
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const all = await tx<HistoryEntry[]>('readonly', (store) => store.getAll())
  return all.sort((a, b) => b.at - a.at)
}

export async function clearHistory(): Promise<void> {
  await tx('readwrite', (store) => store.clear())
}

import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { callAction } from '@/api/client'
import type { HistoryEntry } from '@/storage/history'

/**
 * Single path for every request the app makes. Menus in Task 7 pass a different
 * endpoint and extra body fields, but history, timing, and busy state are
 * recorded identically for all of them — including failures.
 */
export function useTriggerAction() {
  const [busy, setBusy] = useState(false)
  const store = useAppStore

  async function trigger(endpoint?: string, extra: Record<string, unknown> = {}) {
    const s = store.getState()
    const active = s.connections.find((c) => c.name === s.activeConnection)
    if (!active) return

    setBusy(true)
    try {
      const res = await callAction(endpoint ?? s.action, {
        connectorUrl: active.url,
        connectorToken: active.token,
        controller: s.controller,
        action: s.action,
        payload: s.payload,
        limit: s.limit,
        results: JSON.stringify(s.result?.data ?? ''),
        ...extra
      })

      s.setResult(res)

      const serialised = JSON.stringify(res.data ?? null)
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        at: Date.now(),
        connectionName: active.name,
        controller: String(extra.controller ?? s.controller),
        action: endpoint ?? s.action,
        payload: s.payload,
        limit: s.limit,
        status: res.ok ? 'ok' : 'error',
        httpStatus: res.httpStatus,
        durationMs: res.durationMs,
        response: res.data,
        responseBytes: serialised.length,
        truncated: false
      }
      try {
        await s.addHistory(entry)
      } catch (err) {
        // The request itself already succeeded and its response is already
        // rendered via setResult() above, so a failure to persist history
        // (e.g. IndexedDB quota/corruption) is survivable — but left
        // unhandled it escapes as an unhandled promise rejection since
        // callers invoke trigger() from onClick without awaiting/catching it.
        console.error('Failed to save history entry', err)
      }
    } finally {
      setBusy(false)
    }
  }

  return { trigger, busy }
}

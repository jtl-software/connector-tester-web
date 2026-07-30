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

    const effectiveEndpoint = endpoint ?? s.action

    setBusy(true)
    try {
      const res = await callAction(effectiveEndpoint, {
        connectorUrl: active.url,
        connectorToken: active.token,
        controller: s.controller,
        action: s.action,
        payload: s.payload,
        limit: s.limit,
        // `results` (the previously-pulled data, re-serialised) is only read
        // server-side by triggerAck (RouteController::triggerAck ->
        // DevOptionsController::triggerAck), which needs it to acknowledge
        // what was pulled. Every other endpoint ignores it. Sending it on
        // every request meant a large Pull response got re-uploaded on every
        // subsequent call, which can blow past PHP's post_max_size and make
        // the request fail with no useful error.
        ...(effectiveEndpoint === 'triggerAck' ? { results: JSON.stringify(s.result?.data ?? '') } : {}),
        ...extra
      })

      s.setResult(res)

      const serialised = JSON.stringify(res.data ?? null)
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        at: Date.now(),
        connectionName: active.name,
        controller: String(extra.controller ?? s.controller),
        action: effectiveEndpoint,
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
        s.setHistoryError(null)
      } catch (err) {
        // The request itself already succeeded and its response is already
        // rendered via setResult() above, so a failure to persist history
        // (e.g. IndexedDB quota/corruption) is survivable — but left
        // unhandled it escapes as an unhandled promise rejection since
        // callers invoke trigger() from onClick without awaiting/catching it.
        // We still surface it (via historyError) so a silently dropped entry
        // is visible instead of just vanishing from the History rail.
        console.error('Failed to save history entry', err)
        s.setHistoryError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return { trigger, busy }
}

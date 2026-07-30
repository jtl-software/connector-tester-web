import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { callAction } from '@/api/client'
import type { HistoryEntry } from '@/storage/history'
import { newId } from '@/lib/id'

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

      // Everything from here down — building the entry (including id
      // generation) through persisting it — must stay inside this try/catch.
      // The response is already rendered via setResult() above, so any
      // failure in this region (a bad id generator, a persistence error,
      // whatever comes next) is survivable, but only if it's caught here:
      // callers invoke trigger() from onClick without awaiting/catching it,
      // so anything that throws outside this guard escapes as an invisible
      // unhandled promise rejection instead of surfacing via historyError.
      try {
        const serialised = JSON.stringify(res.data ?? null)
        const entry: HistoryEntry = {
          id: newId(),
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
        await s.addHistory(entry)
        s.setHistoryError(null)
      } catch (err) {
        // e.g. IndexedDB quota/corruption, or (formerly) crypto.randomUUID
        // being unavailable in an insecure context.
        console.error('Failed to save history entry', err)
        s.setHistoryError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setBusy(false)
    }
  }

  return { trigger, busy }
}

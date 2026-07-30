import type { ControllerName } from '@/types/domain'

export const PAYLOADS_KEY = 'jtl.payloads'

export interface SavedPayload {
  id: string
  name: string
  controller: ControllerName
  body: string
  updatedAt: number
  /**
   * Connector this payload belongs to. Saved payloads written before this
   * field existed have no `connectionName` at all (not an empty string).
   * We deliberately never backfill/reassign those legacy entries to a
   * guessed connector — we have no reliable way to know which one they
   * belonged to, and guessing wrong would be worse than showing them
   * everywhere. Instead, `visiblePayloads()` below treats a missing
   * `connectionName` as "legacy" and shows it under every connector, so
   * nobody's pre-existing saved payloads silently vanish.
   */
  connectionName?: string
}

/**
 * See the `connectionName` doc comment above: legacy payloads (no
 * `connectionName`) are visible under every connector. When no connection is
 * selected at all, there's nothing to scope to, so the list is empty.
 */
export function visiblePayloads(payloads: SavedPayload[], connectionName: string | null): SavedPayload[] {
  if (!connectionName) return []
  return payloads.filter((p) => p.connectionName == null || p.connectionName === connectionName)
}

export function loadPayloads(): SavedPayload[] {
  try {
    const raw = localStorage.getItem(PAYLOADS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedPayload[]) : []
  } catch {
    return []
  }
}

export function savePayloads(list: SavedPayload[]): void {
  localStorage.setItem(PAYLOADS_KEY, JSON.stringify(list))
}

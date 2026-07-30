import type { ControllerName } from '@/types/domain'

export const PAYLOADS_KEY = 'jtl.payloads'

export interface SavedPayload {
  id: string
  name: string
  controller: ControllerName
  body: string
  updatedAt: number
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

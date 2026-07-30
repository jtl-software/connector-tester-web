import { create } from 'zustand'
import { ACTIONS, type Action, type ControllerName, type Connection, type ApiResult } from '@/types/domain'
import { loadConnections, saveConnections, migrateLegacyConnections } from '@/storage/connections'
import { loadPayloads, savePayloads, type SavedPayload } from '@/storage/payloads'
import { appendHistory, loadHistory, type HistoryEntry } from '@/storage/history'

interface AppState {
  connections: Connection[]
  activeConnection: string | null
  connected: boolean
  controller: ControllerName
  action: Action
  limit: number
  payload: string
  result: ApiResult | null
  history: HistoryEntry[]
  payloads: SavedPayload[]

  init: () => Promise<void>
  setConnections: (list: Connection[]) => void
  setActiveConnection: (name: string | null) => void
  setConnected: (v: boolean) => void
  setController: (c: ControllerName) => void
  setAction: (a: Action) => void
  setLimit: (n: number) => void
  setPayload: (p: string) => void
  setResult: (r: ApiResult | null) => void
  addHistory: (e: HistoryEntry) => Promise<void>
  refreshHistory: () => Promise<void>
  setPayloads: (list: SavedPayload[]) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  connections: [],
  activeConnection: null,
  connected: false,
  controller: 'category',
  action: 'Pull',
  limit: 100,
  payload: '',
  result: null,
  history: [],
  payloads: [],

  init: async () => {
    migrateLegacyConnections()
    set({
      connections: loadConnections(),
      payloads: loadPayloads(),
      history: await loadHistory()
    })
  },

  setConnections: (list) => {
    saveConnections(list)
    set({ connections: list })
  },

  // Switching connectors invalidates the authenticated session.
  setActiveConnection: (name) => set({ activeConnection: name, connected: false }),

  setConnected: (v) => set({ connected: v }),

  setController: (c) => {
    const valid = ACTIONS[c]
    const current = get().action
    set({ controller: c, action: valid.includes(current) ? current : valid[0] })
  },

  setAction: (a) => set({ action: a }),
  setLimit: (n) => set({ limit: Number.isFinite(n) && n > 0 ? n : 100 }),
  setPayload: (p) => set({ payload: p }),
  setResult: (r) => set({ result: r }),

  addHistory: async (e) => {
    await appendHistory(e)
    set({ history: await loadHistory() })
  },

  refreshHistory: async () => set({ history: await loadHistory() }),

  setPayloads: (list) => {
    savePayloads(list)
    set({ payloads: list })
  }
}))

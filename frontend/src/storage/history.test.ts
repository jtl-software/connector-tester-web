import { describe, it, expect, beforeEach } from 'vitest'
import {
  appendHistory, loadHistory, clearHistory, visibleHistory,
  HISTORY_LIMIT, MAX_RESPONSE_BYTES, type HistoryEntry
} from './history'

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    connectionName: 'shop-dev',
    controller: 'category',
    action: 'Pull',
    payload: '',
    limit: 100,
    status: 'ok',
    httpStatus: 200,
    durationMs: 42,
    response: { result: [] },
    responseBytes: 12,
    truncated: false,
    ...over
  }
}

beforeEach(async () => { await clearHistory() })

describe('history storage', () => {
  it('round-trips an entry', async () => {
    await appendHistory(entry({ controller: 'product' }))
    const all = await loadHistory()
    expect(all).toHaveLength(1)
    expect(all[0].controller).toBe('product')
  })

  it('returns newest first', async () => {
    await appendHistory(entry({ at: 1000, controller: 'category' }))
    await appendHistory(entry({ at: 2000, controller: 'product' }))
    const all = await loadHistory()
    expect(all[0].controller).toBe('product')
  })

  it(`keeps at most ${HISTORY_LIMIT} entries`, async () => {
    for (let i = 0; i < HISTORY_LIMIT + 15; i++) {
      await appendHistory(entry({ at: i }))
    }
    expect(await loadHistory()).toHaveLength(HISTORY_LIMIT)
  })

  it('drops the oldest entries when over the limit', async () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      await appendHistory(entry({ at: i, controller: 'category' }))
    }
    const all = await loadHistory()
    const oldest = all[all.length - 1]
    expect(oldest.at).toBeGreaterThanOrEqual(5)
  })

  it('truncates oversized responses and flags them', async () => {
    const huge = 'x'.repeat(MAX_RESPONSE_BYTES + 1000)
    await appendHistory(entry({ response: huge, responseBytes: huge.length }))
    const [stored] = await loadHistory()
    expect(stored.truncated).toBe(true)
    expect(JSON.stringify(stored.response).length).toBeLessThan(MAX_RESPONSE_BYTES + 200)
  })

  it('records failed requests too', async () => {
    await appendHistory(entry({ status: 'error', httpStatus: 500 }))
    const [stored] = await loadHistory()
    expect(stored.status).toBe('error')
    expect(stored.httpStatus).toBe(500)
  })

  it('clears everything', async () => {
    await appendHistory(entry())
    await clearHistory()
    expect(await loadHistory()).toEqual([])
  })

  describe('per-connection retention', () => {
    it(`keeps up to ${HISTORY_LIMIT} entries independently per connectionName`, async () => {
      for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
        await appendHistory(entry({ at: i, connectionName: 'connector-a' }))
      }
      const all = await loadHistory()
      expect(all.filter((e) => e.connectionName === 'connector-a')).toHaveLength(HISTORY_LIMIT)
    })

    it("does not evict connector A's history when connector B exceeds the cap", async () => {
      // Connector A has a modest, well-under-the-cap amount of history.
      for (let i = 0; i < 10; i++) {
        await appendHistory(entry({ at: i, connectionName: 'connector-a' }))
      }
      // Connector B alone blows way past HISTORY_LIMIT.
      for (let i = 0; i < HISTORY_LIMIT + 50; i++) {
        await appendHistory(entry({ at: 1000 + i, connectionName: 'connector-b' }))
      }

      const all = await loadHistory()
      expect(all.filter((e) => e.connectionName === 'connector-a')).toHaveLength(10)
      expect(all.filter((e) => e.connectionName === 'connector-b')).toHaveLength(HISTORY_LIMIT)
    })
  })
})

describe('visibleHistory', () => {
  it('returns nothing when no connection is selected', () => {
    expect(visibleHistory([entry({ connectionName: 'a' })], null)).toEqual([])
  })

  it('only returns entries for the active connection', () => {
    const a = entry({ connectionName: 'a' })
    const b = entry({ connectionName: 'b' })
    expect(visibleHistory([a, b], 'a')).toEqual([a])
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTriggerAction } from './useTriggerAction'
import { useAppStore } from '@/store/useAppStore'
import { clearHistory, loadHistory } from '@/storage/history'
import * as api from '@/api/client'

beforeEach(async () => {
  localStorage.clear()
  await clearHistory()
  useAppStore.setState(useAppStore.getInitialState(), true)
  useAppStore.setState({
    connections: [{ name: 'shop-dev', url: 'http://x', token: 't' }],
    activeConnection: 'shop-dev',
    controller: 'category',
    action: 'Pull'
  })
  vi.restoreAllMocks()
})

describe('useTriggerAction — results only sent for triggerAck (defect 2)', () => {
  it('does not send `results` on a plain Pull', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 5, data: { some: 'pulled data' }
    })
    useAppStore.setState({ result: { ok: true, httpStatus: 200, durationMs: 1, data: { previous: 'response' } } })

    const { result } = renderHook(() => useTriggerAction())
    await act(async () => {
      await result.current.trigger()
    })

    expect(spy).toHaveBeenCalledTimes(1)
    const [, body] = spy.mock.calls[0]
    expect(body).not.toHaveProperty('results')
  })

  it('does not send `results` on a Push', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 5, data: {}
    })
    useAppStore.setState({
      action: 'Push',
      result: { ok: true, httpStatus: 200, durationMs: 1, data: { previous: 'response' } }
    })

    const { result } = renderHook(() => useTriggerAction())
    await act(async () => {
      await result.current.trigger()
    })

    const [, body] = spy.mock.calls[0]
    expect(body).not.toHaveProperty('results')
  })

  it('sends `results` (the previously-pulled data) for triggerAck', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 5, data: {}
    })
    useAppStore.setState({
      result: { ok: true, httpStatus: 200, durationMs: 1, data: { pulled: [1, 2, 3] } }
    })

    const { result } = renderHook(() => useTriggerAction())
    await act(async () => {
      await result.current.trigger('triggerAck')
    })

    expect(spy).toHaveBeenCalledWith('triggerAck', expect.objectContaining({
      results: JSON.stringify({ pulled: [1, 2, 3] })
    }))
  })
})

describe('useTriggerAction — a failed history write surfaces instead of vanishing (defect 1)', () => {
  it('records historyError when addHistory rejects, and clears it on the next success', async () => {
    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 5, data: { big: 'pull response' }
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    useAppStore.setState({
      addHistory: async () => {
        throw new Error('IndexedDB quota exceeded')
      }
    })

    const { result } = renderHook(() => useTriggerAction())

    // The failure must not escape as an unhandled rejection — trigger() has to
    // resolve cleanly even though addHistory() rejected.
    await act(async () => {
      await result.current.trigger()
    })

    await waitFor(() => {
      expect(useAppStore.getState().historyError).toBe('IndexedDB quota exceeded')
    })
    expect(consoleSpy).toHaveBeenCalled()

    // Restore a working addHistory and confirm a subsequent successful save
    // clears the error again.
    const realAddHistory = useAppStore.getInitialState().addHistory
    useAppStore.setState({ addHistory: realAddHistory })

    await act(async () => {
      await result.current.trigger()
    })

    await waitFor(() => {
      expect(useAppStore.getState().historyError).toBeNull()
    })
  })
})

describe('useTriggerAction — history ids survive an insecure context (crypto.randomUUID missing)', () => {
  afterEach(() => {
    // @ts-expect-error -- restore access to the real Crypto.prototype.randomUUID
    delete crypto.randomUUID
  })

  it('still records history successfully when crypto.randomUUID is undefined', async () => {
    // `randomUUID` lives on `Crypto.prototype`; shadow it with an own
    // property set to `undefined` to simulate the insecure-context browser
    // tab where it doesn't exist (see frontend/src/lib/id.test.ts for why
    // `delete` alone doesn't do this).
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    expect(typeof crypto.randomUUID).toBe('undefined')

    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 5, data: { some: 'pulled data' }
    })

    const { result } = renderHook(() => useTriggerAction())

    // This must not throw / reject — that's exactly the shipped bug.
    await act(async () => {
      await result.current.trigger()
    })

    await waitFor(() => {
      expect(useAppStore.getState().historyError).toBeNull()
    })

    const history = await loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
})

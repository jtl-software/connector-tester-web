import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'
import { clearHistory } from '@/storage/history'

beforeEach(async () => {
  localStorage.clear()
  await clearHistory()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('app store', () => {
  it('defaults to category/Pull', () => {
    const s = useAppStore.getState()
    expect(s.controller).toBe('category')
    expect(s.action).toBe('Pull')
  })

  it('resets the action to the first valid one when the controller changes', () => {
    useAppStore.getState().setController('connector')
    expect(useAppStore.getState().action).toBe('Finish')
  })

  it('keeps the action if it is still valid for the new controller', () => {
    useAppStore.getState().setAction('Stats')
    useAppStore.getState().setController('product')
    expect(useAppStore.getState().action).toBe('Stats')
  })

  it('imports legacy connections on init', async () => {
    localStorage.setItem('shop-dev', JSON.stringify({ url: 'http://a', token: 'a1' }))
    await useAppStore.getState().init()
    expect(useAppStore.getState().connections.map((c) => c.name)).toEqual(['shop-dev'])
  })

  it('drops the connected flag when the active connection changes', () => {
    useAppStore.setState({ connected: true })
    useAppStore.getState().setActiveConnection('other')
    expect(useAppStore.getState().connected).toBe(false)
  })
})

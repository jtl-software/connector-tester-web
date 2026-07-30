import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionPanel } from './ConnectionPanel'
import { useAppStore } from '@/store/useAppStore'
import * as api from '@/api/client'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
  vi.restoreAllMocks()
})

describe('ConnectionPanel', () => {
  it('shows a disconnected state with no active connection', () => {
    render(<ConnectionPanel />)
    expect(screen.getByText(/not connected/i)).toBeInTheDocument()
  })

  it('shows the endpoint url of the active connection', () => {
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://localhost/connector.php', token: 't' }],
      activeConnection: 'shop-dev'
    })
    render(<ConnectionPanel />)
    expect(screen.getByText('http://localhost/connector.php')).toBeInTheDocument()
  })

  it('sets connected on a successful authenticate', async () => {
    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 10, data: { sessionId: 'abc' }
    })
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://x', token: 't' }],
      activeConnection: 'shop-dev'
    })

    render(<ConnectionPanel />)
    await userEvent.click(screen.getByRole('button', { name: /authenticate/i }))

    expect(useAppStore.getState().connected).toBe(true)
  })

  it('stays disconnected on a transport/network error (ok: false)', async () => {
    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: false, httpStatus: 500, durationMs: 5, data: null, errorMessage: 'nope'
    })
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://x', token: 't' }],
      activeConnection: 'shop-dev'
    })

    render(<ConnectionPanel />)
    await userEvent.click(screen.getByRole('button', { name: /authenticate/i }))

    expect(useAppStore.getState().connected).toBe(false)
  })

  // AuthController::startAuth() (src/Controller/AuthController.php) catches
  // ResponseException itself and returns the string 'Error: …' with HTTP 200
  // — this is the actual shape the backend produces for a bad token, unlike
  // a 500. A previous version of this test mocked { ok: false, httpStatus:
  // 500 } here, a shape the backend never returns for an auth failure, so it
  // never would have caught the bug where a 200-with-Error body reported
  // "Connected".
  it('stays disconnected when authenticate returns HTTP 200 with an Error: body', async () => {
    vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 5, data: 'Error: invalid connector token'
    })
    useAppStore.setState({
      connections: [{ name: 'shop-dev', url: 'http://x', token: 'bad-token' }],
      activeConnection: 'shop-dev'
    })

    render(<ConnectionPanel />)
    await userEvent.click(screen.getByRole('button', { name: /authenticate/i }))

    expect(useAppStore.getState().connected).toBe(false)
  })
})

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

  it('stays disconnected when authenticate fails', async () => {
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
})

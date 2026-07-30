import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkingsMenu } from './LinkingsMenu'
import { useAppStore } from '@/store/useAppStore'
import * as api from '@/api/client'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
  useAppStore.setState({
    connected: true,
    connections: [{ name: 'c', url: 'http://x', token: 't' }],
    activeConnection: 'c'
  })
  vi.restoreAllMocks()
})

describe('LinkingsMenu', () => {
  it('does not fire a destructive request until confirmed', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 1, data: {}
    })

    render(<LinkingsMenu />)
    await userEvent.click(screen.getByRole('button', { name: /linkings/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /clear all/i }))

    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('fires the request after confirmation', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 1, data: {}
    })

    render(<LinkingsMenu />)
    await userEvent.click(screen.getByRole('button', { name: /linkings/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /clear all/i }))
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(spy).toHaveBeenCalledWith('clearLinkings', expect.anything())
  })

  it('passes the variation table explicitly, not the selected controller', async () => {
    const spy = vi.spyOn(api, 'callAction').mockResolvedValue({
      ok: true, httpStatus: 200, durationMs: 1, data: {}
    })

    render(<LinkingsMenu />)
    await userEvent.click(screen.getByRole('button', { name: /linkings/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /clear variation linkings/i }))
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }))

    expect(spy).toHaveBeenCalledWith(
      'clearControllerLinkings',
      expect.objectContaining({ controller: 'productVariation' })
    )
  })
})

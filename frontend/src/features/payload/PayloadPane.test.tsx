import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PayloadPane } from './PayloadPane'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('PayloadPane — Save uses an in-app dialog, never window.prompt', () => {
  it('never calls window.prompt (Electron does not support it — the prior bug)', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('prompt() is not supported.')
    })
    useAppStore.setState({ payload: '{"a":1}', activeConnection: 'c' })

    render(<PayloadPane />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(promptSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('disables Save when no connection is selected', () => {
    useAppStore.setState({ payload: '{"a":1}', activeConnection: null })
    render(<PayloadPane />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('saves the payload scoped to the active connection', async () => {
    useAppStore.setState({ payload: '{"a":1}', activeConnection: 'connector-1', controller: 'product' })
    render(<PayloadPane />)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox', { name: /payload name/i }), 'my payload')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    const saved = useAppStore.getState().payloads
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ name: 'my payload', connectionName: 'connector-1', controller: 'product', body: '{"a":1}' })
  })
})

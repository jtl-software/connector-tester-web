import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedPayloadList } from './SavedPayloadList'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('SavedPayloadList', () => {
  it('shows an empty state', () => {
    useAppStore.setState({ activeConnection: 'c' })
    render(<SavedPayloadList />)
    expect(screen.getByText(/no saved payloads/i)).toBeInTheDocument()
  })

  it('shows an empty state when no connection is selected, even with payloads present', () => {
    useAppStore.setState({
      activeConnection: null,
      payloads: [{ id: '1', name: 'cat basic', controller: 'category', body: '{"x":1}', updatedAt: 1, connectionName: 'c' }]
    })
    render(<SavedPayloadList />)
    expect(screen.getByText(/no saved payloads/i)).toBeInTheDocument()
  })

  it('loads a payload into the editor and switches controller', async () => {
    useAppStore.setState({
      activeConnection: 'c',
      payloads: [{ id: '1', name: 'cat basic', controller: 'category', body: '{"x":1}', updatedAt: 1, connectionName: 'c' }]
    })

    render(<SavedPayloadList />)
    await userEvent.click(screen.getByRole('button', { name: /cat basic/i }))

    expect(useAppStore.getState().payload).toBe('{"x":1}')
    expect(useAppStore.getState().controller).toBe('category')
  })

  it('persists across a store reload', () => {
    useAppStore.getState().setPayloads([
      { id: '1', name: 'kept', controller: 'product', body: '{}', updatedAt: 1, connectionName: 'c' }
    ])
    expect(localStorage.getItem('jtl.payloads')).toContain('kept')
  })

  describe('per-connector scoping', () => {
    it('hides payloads belonging to a different connector', () => {
      useAppStore.setState({
        activeConnection: 'connector-2',
        payloads: [{ id: '1', name: 'connector-1 only', controller: 'category', body: '{}', updatedAt: 1, connectionName: 'connector-1' }]
      })
      render(<SavedPayloadList />)
      expect(screen.queryByText('connector-1 only')).not.toBeInTheDocument()
    })

    it('shows only the active connector\'s payloads when both connectors have saved payloads', () => {
      useAppStore.setState({
        activeConnection: 'connector-1',
        payloads: [
          { id: '1', name: 'for one', controller: 'category', body: '{}', updatedAt: 1, connectionName: 'connector-1' },
          { id: '2', name: 'for two', controller: 'category', body: '{}', updatedAt: 1, connectionName: 'connector-2' }
        ]
      })
      render(<SavedPayloadList />)
      expect(screen.getByText('for one')).toBeInTheDocument()
      expect(screen.queryByText('for two')).not.toBeInTheDocument()
    })

    it('shows legacy payloads (no connectionName) under every connector', () => {
      useAppStore.setState({
        activeConnection: 'connector-1',
        payloads: [{ id: '1', name: 'pre-existing payload', controller: 'category', body: '{}', updatedAt: 1 }]
      })
      const { unmount } = render(<SavedPayloadList />)
      expect(screen.getByText('pre-existing payload')).toBeInTheDocument()
      unmount()

      useAppStore.setState({ activeConnection: 'connector-2' })
      render(<SavedPayloadList />)
      expect(screen.getByText('pre-existing payload')).toBeInTheDocument()
    })
  })

  describe('rename', () => {
    it('renames a payload and the new name persists across a store reload', async () => {
      useAppStore.setState({
        activeConnection: 'c',
        payloads: [{ id: '1', name: 'old name', controller: 'category', body: '{}', updatedAt: 1, connectionName: 'c' }]
      })
      render(<SavedPayloadList />)

      await userEvent.click(screen.getByRole('button', { name: 'Rename payload' }))
      await userEvent.clear(screen.getByRole('textbox', { name: /payload name/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /payload name/i }), 'new name')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('new name')).toBeInTheDocument()
      expect(useAppStore.getState().payloads[0].name).toBe('new name')

      // Reload the store from localStorage the way init() does, and confirm
      // the rename survived the round trip.
      useAppStore.setState(useAppStore.getInitialState(), true)
      await useAppStore.getState().init()
      expect(useAppStore.getState().payloads[0].name).toBe('new name')
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryList } from './HistoryList'
import { useAppStore } from '@/store/useAppStore'
import { clearHistory, type HistoryEntry } from '@/storage/history'

function entry(over: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: crypto.randomUUID(), at: Date.now(), connectionName: 'c',
    controller: 'category', action: 'Pull', payload: '{"a":1}', limit: 50,
    status: 'ok', httpStatus: 200, durationMs: 42,
    response: { result: [] }, responseBytes: 12, truncated: false, ...over
  }
}

beforeEach(async () => {
  localStorage.clear()
  await clearHistory()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('HistoryList', () => {
  it('shows an empty state', () => {
    useAppStore.setState({ activeConnection: 'c' })
    render(<HistoryList />)
    expect(screen.getByText(/no requests yet/i)).toBeInTheDocument()
  })

  it('shows an empty state when no connection is selected, even with history present', () => {
    useAppStore.setState({ activeConnection: null, history: [entry()] })
    render(<HistoryList />)
    expect(screen.getByText(/no requests yet/i)).toBeInTheDocument()
  })

  it('lists entries with status and duration', () => {
    useAppStore.setState({ activeConnection: 'c', history: [entry({ controller: 'product', durationMs: 1200 })] })
    render(<HistoryList />)
    expect(screen.getByText(/product/)).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows a warning banner when the last history write failed (defect 1)', () => {
    useAppStore.setState({ historyError: 'IndexedDB quota exceeded' })
    render(<HistoryList />)
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved to history/i)
  })

  it('shows no warning banner when there is no history error', () => {
    render(<HistoryList />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('restores controller, action, limit, and payload on click', async () => {
    useAppStore.setState({
      activeConnection: 'c',
      history: [entry({ controller: 'manufacturer', action: 'Push', limit: 7, payload: '{"z":9}' })]
    })

    render(<HistoryList />)
    await userEvent.click(screen.getByRole('button', { name: /manufacturer/i }))

    const s = useAppStore.getState()
    expect(s.controller).toBe('manufacturer')
    expect(s.action).toBe('Push')
    expect(s.limit).toBe(7)
    expect(s.payload).toBe('{"z":9}')
  })

  describe('per-connector scoping', () => {
    it('hides entries belonging to a different connector', () => {
      useAppStore.setState({
        activeConnection: 'connector-2',
        history: [entry({ connectionName: 'connector-1', controller: 'product' })]
      })
      render(<HistoryList />)
      expect(screen.queryByText(/product/)).not.toBeInTheDocument()
      expect(screen.getByText(/no requests yet/i)).toBeInTheDocument()
    })

    it('shows only the active connector\'s entries when both connectors have history', () => {
      useAppStore.setState({
        activeConnection: 'connector-1',
        history: [
          entry({ connectionName: 'connector-1', controller: 'product' }),
          entry({ connectionName: 'connector-2', controller: 'customer' })
        ]
      })
      render(<HistoryList />)
      expect(screen.getByText(/product/)).toBeInTheDocument()
      expect(screen.queryByText(/customer/)).not.toBeInTheDocument()
    })
  })

  describe('rename', () => {
    it('shows the label instead of controller · action once renamed', () => {
      useAppStore.setState({
        activeConnection: 'c',
        history: [entry({ controller: 'product', action: 'Pull', label: 'Nightly pull' })]
      })
      render(<HistoryList />)
      expect(screen.getByText('Nightly pull')).toBeInTheDocument()
      expect(screen.queryByText(/product · Pull/)).not.toBeInTheDocument()
    })

    it('opens the rename dialog and persists the new label without breaking restore', async () => {
      const e = entry({ controller: 'product', action: 'Pull' })
      useAppStore.setState({ activeConnection: 'c', history: [e] })
      render(<HistoryList />)

      await userEvent.click(screen.getByRole('button', { name: /rename/i }))
      await userEvent.type(screen.getByRole('textbox', { name: /entry name/i }), 'My renamed run')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(await screen.findByText('My renamed run')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: /my renamed run/i }))
      expect(useAppStore.getState().controller).toBe('product')
      expect(useAppStore.getState().action).toBe('Pull')
    })
  })
})

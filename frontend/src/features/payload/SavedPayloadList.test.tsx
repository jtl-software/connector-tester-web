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
    render(<SavedPayloadList />)
    expect(screen.getByText(/no saved payloads/i)).toBeInTheDocument()
  })

  it('loads a payload into the editor and switches controller', async () => {
    useAppStore.setState({
      payloads: [{ id: '1', name: 'cat basic', controller: 'category', body: '{"x":1}', updatedAt: 1 }]
    })

    render(<SavedPayloadList />)
    await userEvent.click(screen.getByRole('button', { name: /cat basic/i }))

    expect(useAppStore.getState().payload).toBe('{"x":1}')
    expect(useAppStore.getState().controller).toBe('category')
  })

  it('persists across a store reload', () => {
    useAppStore.getState().setPayloads([
      { id: '1', name: 'kept', controller: 'product', body: '{}', updatedAt: 1 }
    ])
    expect(localStorage.getItem('jtl.payloads')).toContain('kept')
  })
})

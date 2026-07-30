import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RequestToolbar } from './RequestToolbar'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('RequestToolbar', () => {
  it('disables Trigger while disconnected', () => {
    render(<RequestToolbar />)
    expect(screen.getByRole('button', { name: /trigger/i })).toBeDisabled()
  })

  it('enables Trigger once connected', () => {
    useAppStore.setState({ connected: true })
    render(<RequestToolbar />)
    expect(screen.getByRole('button', { name: /trigger/i })).toBeEnabled()
  })

  it('offers only the actions valid for the selected controller', () => {
    useAppStore.setState({ connected: true })
    useAppStore.getState().setController('deliveryNote')
    expect(useAppStore.getState().action).toBe('Push')
  })
})

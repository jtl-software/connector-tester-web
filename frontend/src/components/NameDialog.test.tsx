import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NameDialog } from './NameDialog'

describe('NameDialog', () => {
  it('is not rendered when closed', () => {
    render(<NameDialog open={false} title="Name this" label="Name" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders as an accessible dialog pre-filled with the initial value', () => {
    render(
      <NameDialog open title="Rename entry" label="Entry name" initialValue="old name" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rename entry' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Entry name' })).toHaveValue('old name')
  })

  it('confirms the trimmed value on Save', async () => {
    const onConfirm = vi.fn()
    render(<NameDialog open title="Name this" label="Name" onConfirm={onConfirm} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), '  my payload  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onConfirm).toHaveBeenCalledWith('my payload')
  })

  it('confirms on Enter', async () => {
    const onConfirm = vi.fn()
    render(<NameDialog open title="Name this" label="Name" onConfirm={onConfirm} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'quick save{Enter}')

    expect(onConfirm).toHaveBeenCalledWith('quick save')
  })

  it('cancels on Escape without confirming', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<NameDialog open title="Name this" label="Name" onConfirm={onConfirm} onCancel={onCancel} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'abc{Escape}')

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('cancels on Cancel button click', async () => {
    const onCancel = vi.fn()
    render(<NameDialog open title="Name this" label="Name" onConfirm={vi.fn()} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('does not confirm an empty or whitespace-only name', async () => {
    const onConfirm = vi.fn()
    render(<NameDialog open title="Name this" label="Name" onConfirm={onConfirm} onCancel={vi.fn()} />)

    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), '   ')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

    await userEvent.keyboard('{Enter}')
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

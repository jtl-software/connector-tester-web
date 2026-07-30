import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandHeader } from './BrandHeader'
import pkg from '../../package.json'

describe('BrandHeader', () => {
  it('renders the current package version so a running build can be identified', () => {
    render(<BrandHeader />)
    expect(screen.getByText(`v${pkg.version}`)).toBeInTheDocument()
  })
})

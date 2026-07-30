import { describe, it, expect } from 'vitest'
import { ACTIONS, CONTROLLER_LABELS, CONTROLLERS, LINKING_TARGETS } from './domain'

describe('controller/action tables', () => {
  it('has exactly 16 controllers', () => {
    expect(CONTROLLERS).toHaveLength(16)
  })

  it('gives every controller at least one action', () => {
    for (const c of CONTROLLERS) {
      expect(ACTIONS[c].length, `${c} has no actions`).toBeGreaterThan(0)
    }
  })

  it('gives every controller a human label', () => {
    for (const c of CONTROLLERS) {
      expect(CONTROLLER_LABELS[c], `${c} has no label`).toBeTruthy()
    }
  })

  it('excludes the variation linking tables from controllers', () => {
    expect(CONTROLLERS).not.toContain('productVariation')
    expect(CONTROLLERS).not.toContain('productVariationValue')
  })

  it('includes the variation tables as linking targets', () => {
    expect(LINKING_TARGETS).toContain('productVariation')
    expect(LINKING_TARGETS).toContain('productVariationValue')
  })
})

import { describe, it, expect } from 'vitest'
import { filterResponse } from './responseFilter'

describe('filterResponse', () => {
  it('returns the whole entity when a bare array is filtered by a value nested two levels deep', () => {
    const data = [
      { id: 1, sku: 'widget-1', meta: { supplier: { id: 'sup-1' } } },
      { id: 2, sku: 'widget-2', meta: { supplier: { id: 'sku-42' } } },
      { id: 3, sku: 'widget-3', meta: { supplier: { id: 'sup-3' } } }
    ]

    const result = filterResponse(data, 'sku-42')

    expect(result.kind).toBe('entities')
    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.totalCount).toBe(3)
    expect(result.matches).toHaveLength(1)
    // The whole entity is present, not just the matching line.
    expect(result.matches[0].text).toContain('"id": 2')
    expect(result.matches[0].text).toContain('"sku": "widget-2"')
    expect(result.matches[0].text).toContain('sku-42')
  })

  it('finds the same nested match when entities live under a `result` key', () => {
    const data = {
      result: [
        { id: 1, sku: 'widget-1', meta: { supplier: { id: 'sup-1' } } },
        { id: 2, sku: 'widget-2', meta: { supplier: { id: 'sku-42' } } }
      ]
    }

    const result = filterResponse(data, 'sku-42')

    expect(result.kind).toBe('entities')
    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.totalCount).toBe(2)
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].text).toContain('"id": 2')
  })

  it('computes correct matched-line indices within the rendered entity', () => {
    const data = [{ id: 42, name: 'widget', tags: ['sku-42', 'other'] }]

    const result = filterResponse(data, '42')

    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.matches).toHaveLength(1)
    const { text, matchedLines } = result.matches[0]
    const lines = text.split('\n')

    // Every reported index actually contains the filter text...
    for (const idx of matchedLines) {
      expect(lines[idx].toLowerCase()).toContain('42')
    }
    // ...and every line containing the filter text was reported.
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes('42')) {
        expect(matchedLines).toContain(idx)
      }
    })
  })

  it('reports zero matches honestly when the filter matches nothing', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }]

    const result = filterResponse(data, 'nonexistent-value')

    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.totalCount).toBe(3)
    expect(result.matches).toHaveLength(0)
  })

  it('matches a filter that is a KEY name, not a value', () => {
    const data = [
      { id: 1, sku: 'a' },
      { id: 2, specialFlag: true }
    ]

    const result = filterResponse(data, 'specialFlag')

    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].text).toContain('"id": 2')
  })

  it('is case-insensitive', () => {
    const data = [{ id: 1, sku: 'WIDGET-Special' }]

    const result = filterResponse(data, 'widget-special')

    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.matches).toHaveLength(1)
  })

  it('reports every matching line when an entity contains the term more than once', () => {
    const data = [{ id: 1, sku: 'dup', alt: 'dup', nested: { again: 'dup' } }]

    const result = filterResponse(data, 'dup')

    if (result.kind !== 'entities') throw new Error('unreachable')
    expect(result.matches).toHaveLength(1)
    expect(result.matches[0].matchedLines.length).toBe(3)
  })

  it('falls back to line-based filtering for a scalar response without throwing', () => {
    expect(() => filterResponse('just a string', 'string')).not.toThrow()
    const result = filterResponse('just a string', 'string')
    expect(result.kind).toBe('lines')
  })

  it('falls back to line-based filtering for null without throwing', () => {
    expect(() => filterResponse(null, 'anything')).not.toThrow()
    const result = filterResponse(null, 'anything')
    expect(result.kind).toBe('lines')
  })

  it('falls back to line-based filtering for a plain object with no obvious entity array', () => {
    const data = { status: 'ok', count: 5, message: 'hello world' }

    const result = filterResponse(data, 'hello')

    expect(result.kind).toBe('lines')
    if (result.kind !== 'lines') throw new Error('unreachable')
    expect(result.text.toLowerCase()).toContain('hello')
  })

  it('line-based fallback still matches case-insensitively', () => {
    const result = filterResponse({ message: 'Hello World' }, 'hello')
    if (result.kind !== 'lines') throw new Error('unreachable')
    expect(result.text).toContain('Hello World')
  })
})

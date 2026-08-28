import { describe, expect, it } from 'vitest'
import { countDistinctLineItemGroups, lineItemGroupKey } from './lineItemGrouping'

function item(
  overrides: Partial<{ sku: string | null; upc: string | null; description: string }> = {},
) {
  return { sku: null, upc: null, description: 'Widget', ...overrides }
}

describe('lineItemGroupKey', () => {
  it('prefers sku', () => {
    expect(lineItemGroupKey({ sku: 'ABC-1', upc: '123', description: 'Widget' })).toBe('sku:abc-1')
  })

  it('falls back to upc when sku is absent', () => {
    expect(lineItemGroupKey({ sku: null, upc: '123456', description: 'Widget' })).toBe('upc:123456')
  })

  it('falls back to normalized description when neither sku nor upc is present', () => {
    expect(lineItemGroupKey({ sku: null, upc: null, description: '  Blue   Widget  ' })).toBe(
      'desc:blue widget',
    )
  })
})

describe('countDistinctLineItemGroups', () => {
  it('counts each unique key once, regardless of quantity/rows sharing it', () => {
    const count = countDistinctLineItemGroups([
      item({ sku: 'A' }),
      item({ sku: 'A' }),
      item({ sku: 'B' }),
    ])
    expect(count).toBe(2)
  })

  it('returns 0 for no line items', () => {
    expect(countDistinctLineItemGroups([])).toBe(0)
  })
})

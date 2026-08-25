import { describe, expect, it } from 'vitest'
import {
  aggregateLotProfitability,
  buildResearchCandidate,
  groupLineItems,
  lineItemGroupKey,
  selectGroupsToResearch,
  SKU_RESEARCH_CAP,
} from './lotProfitability'
import type { LineItemDoc } from './types'

function item(overrides: Partial<LineItemDoc> = {}): LineItemDoc {
  return {
    sku: null,
    upc: null,
    description: 'Widget',
    quantity: 1,
    unitCost: 10,
    condition: null,
    category: null,
    ...overrides,
  }
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

describe('groupLineItems', () => {
  it('merges quantity and value across rows sharing the same key', () => {
    const groups = groupLineItems([
      item({ sku: 'A', quantity: 2, unitCost: 10 }),
      item({ sku: 'A', quantity: 3, unitCost: 10 }),
      item({ sku: 'B', quantity: 1, unitCost: 5 }),
    ])
    expect(groups).toHaveLength(2)
    const groupA = groups.find((g) => g.key === 'sku:a')
    expect(groupA?.quantity).toBe(5)
    expect(groupA?.totalValue).toBe(50)
  })
})

describe('selectGroupsToResearch', () => {
  it('picks highest-value groups first, capped', () => {
    const groups = Array.from({ length: SKU_RESEARCH_CAP + 5 }, (_, i) =>
      groupLineItems([item({ sku: `sku-${i.toString()}`, unitCost: i, quantity: 1 })]),
    ).flat()
    const selected = selectGroupsToResearch(groups)
    expect(selected).toHaveLength(SKU_RESEARCH_CAP)
    // Highest unitCost values (i.e. the last ones generated) should win.
    expect(selected[0]?.totalValue).toBe(SKU_RESEARCH_CAP + 4)
  })

  it('returns everything when under the cap', () => {
    const groups = groupLineItems([item({ sku: 'A' }), item({ sku: 'B' })])
    expect(selectGroupsToResearch(groups)).toHaveLength(2)
  })
})

describe('buildResearchCandidate', () => {
  it('defaults condition rather than guessing from manifest data', () => {
    const candidate = buildResearchCandidate(item({ description: 'Air fryer', upc: '999' }))
    expect(candidate.itemName).toBe('Air fryer')
    expect(candidate.barcodeNumber).toBe('999')
    expect(candidate.condition).toBe('good')
    expect(candidate.conditionJustification).toMatch(/not independently verified/)
  })

  it('defaults category to General when the manifest has none', () => {
    expect(buildResearchCandidate(item({ category: null })).category).toBe('General')
  })
})

describe('aggregateLotProfitability', () => {
  it('computes landed cost across every line item, resale value only for researched groups', () => {
    const lineItems = [
      item({ sku: 'A', quantity: 2, unitCost: 10 }),
      item({ sku: 'B', quantity: 1, unitCost: 20 }),
    ]
    const groups = groupLineItems(lineItems)
    const groupA = groups.find((g) => g.key === 'sku:a')
    if (!groupA) throw new Error('expected group A')

    // Only group A got researched (group B simulates a past-the-cap skip).
    const result = aggregateLotProfitability(lineItems, 2, [{ group: groupA, salePrice: 25 }], 0, 0)

    expect(result.totalLandedCost).toBe(40) // (2*10) + (1*20), no freight/fees
    expect(result.projectedResaleValue).toBe(50) // 25 * qty 2
    expect(result.projectedProfit).toBe(10)
    expect(result.marginPct).toBeCloseTo(0.25)
    expect(result.skusResearched).toBe(1)
    expect(result.skusTotal).toBe(2)
    expect(result.factors.some((f) => f.label.includes('1 of 2 distinct items researched'))).toBe(
      true,
    )
  })

  it('treats a researched-but-priceless SKU as $0 resale, flagged separately from an unresearched one', () => {
    const lineItems = [item({ sku: 'A', quantity: 1, unitCost: 10 })]
    const groups = groupLineItems(lineItems)
    const groupA = groups[0]

    const result = aggregateLotProfitability(
      lineItems,
      1,
      [{ group: groupA, salePrice: null }],
      0,
      0,
    )

    expect(result.projectedResaleValue).toBe(0)
    expect(result.skusResearched).toBe(0)
    expect(result.factors.some((f) => f.label.includes('no usable price found'))).toBe(true)
  })

  it('applies freight/fees to landed cost via the existing multiplier formula', () => {
    const lineItems = [item({ sku: 'A', quantity: 1, unitCost: 100 })]
    const result = aggregateLotProfitability(lineItems, 1, [], 20, 5)
    expect(result.totalLandedCost).toBeCloseTo(125) // 100 * 1.25
  })

  it('returns a null margin when there is no landed cost to divide by', () => {
    const result = aggregateLotProfitability([], 0, [], 0, 0)
    expect(result.marginPct).toBeNull()
    expect(result.factors[0]?.label).toBe('No line items to score')
  })
})

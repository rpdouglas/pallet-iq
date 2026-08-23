import { describe, expect, it } from 'vitest'
import { computeSaleability } from './computeSaleability'
import type { SaleabilityInputs } from './computeSaleability'

const BASE_INPUTS: SaleabilityInputs = {
  priceVariance: 0.1,
  condition: 'good',
  listingCount: 5,
  salesRank: null,
  sampleSize: 8,
}

describe('computeSaleability', () => {
  it('returns a score between 0 and 1', () => {
    const result = computeSaleability(BASE_INPUTS)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it('always includes an honest "sell-through not available" factor first', () => {
    const result = computeSaleability(BASE_INPUTS)
    expect(result.factors[0]).toEqual(
      expect.objectContaining({
        label: 'Sell-through rate not available yet',
        direction: 'neutral',
      }),
    )
  })

  it('scores better condition higher, all else equal', () => {
    const good = computeSaleability({ ...BASE_INPUTS, condition: 'good' })
    const fair = computeSaleability({ ...BASE_INPUTS, condition: 'fair' })
    expect(good.score).toBeGreaterThan(fair.score)
  })

  it('scores tighter price variance higher, all else equal', () => {
    const tight = computeSaleability({ ...BASE_INPUTS, priceVariance: 0.05 })
    const wide = computeSaleability({ ...BASE_INPUTS, priceVariance: 0.9 })
    expect(tight.score).toBeGreaterThan(wide.score)
  })

  it('scores fewer competing listings higher, all else equal', () => {
    const low = computeSaleability({ ...BASE_INPUTS, listingCount: 2 })
    const high = computeSaleability({ ...BASE_INPUTS, listingCount: 20 })
    expect(low.score).toBeGreaterThan(high.score)
  })

  it('scores a better (lower) Amazon sales rank higher when present', () => {
    const bestseller = computeSaleability({ ...BASE_INPUTS, salesRank: 100 })
    const obscure = computeSaleability({ ...BASE_INPUTS, salesRank: 900_000 })
    expect(bestseller.score).toBeGreaterThan(obscure.score)
  })

  it('redistributes the salesRank weight when no Keepa match exists, without crashing', () => {
    const result = computeSaleability({ ...BASE_INPUTS, salesRank: null })
    expect(result.score).toBeGreaterThan(0)
    expect(result.factors.some((f) => f.label === 'No Amazon sales rank data')).toBe(true)
  })

  it('redistributes the priceVariance weight when there is no comp sample', () => {
    const result = computeSaleability({ ...BASE_INPUTS, priceVariance: null, sampleSize: 0 })
    expect(result.score).toBeGreaterThan(0)
    expect(
      result.factors.some((f) => f.label.includes('clustered') || f.label.includes('scattered')),
    ).toBe(false)
  })

  it('flags a thin comp sample', () => {
    const result = computeSaleability({ ...BASE_INPUTS, sampleSize: 2 })
    expect(result.factors.some((f) => f.label.includes('Thin comp sample'))).toBe(true)
  })

  it('does not flag a healthy comp sample as thin', () => {
    const result = computeSaleability({ ...BASE_INPUTS, sampleSize: 8 })
    expect(result.factors.some((f) => f.label.includes('Thin comp sample'))).toBe(false)
  })
})

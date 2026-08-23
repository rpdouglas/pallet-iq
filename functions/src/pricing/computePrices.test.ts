import { describe, expect, it } from 'vitest'
import {
  ASKING_TO_SOLD_DISCOUNT_RATIO,
  CONDITION_SALE_MULTIPLIERS,
  computeLiquidationPrice,
  computeMsrp,
  computePriceVariance,
  computeSalePrice,
} from './computePrices'

describe('computeMsrp', () => {
  it('returns null with no sources', () => {
    expect(computeMsrp([null, null])).toEqual({ msrp: null, sourcesAgree: null })
  })

  it('returns the single available source with unknown agreement', () => {
    expect(computeMsrp([99.99, null])).toEqual({ msrp: 99.99, sourcesAgree: null })
  })

  it('averages two agreeing sources and marks sourcesAgree true', () => {
    const result = computeMsrp([100, 95])
    expect(result.msrp).toBe(97.5)
    expect(result.sourcesAgree).toBe(true)
  })

  it('marks sourcesAgree false when sources diverge by more than 20%', () => {
    const result = computeMsrp([100, 50])
    expect(result.sourcesAgree).toBe(false)
  })

  it('averages 3+ sources', () => {
    const result = computeMsrp([100, 100, 106])
    expect(result.msrp).toBeCloseTo(102)
    expect(result.sourcesAgree).toBe(true)
  })
})

describe('computeSalePrice', () => {
  it('returns null with no comps', () => {
    expect(computeSalePrice([], 'good')).toBeNull()
  })

  it('scales the comp median by condition and the asking-to-sold ratio', () => {
    const result = computeSalePrice([100, 100, 100], 'new')
    expect(result?.point).toBeCloseTo(
      100 * ASKING_TO_SOLD_DISCOUNT_RATIO * CONDITION_SALE_MULTIPLIERS.new,
    )
  })

  it('produces a lower point estimate for worse condition, same comps', () => {
    const good = computeSalePrice([100, 100, 100], 'good')
    const fair = computeSalePrice([100, 100, 100], 'fair')
    expect(good).not.toBeNull()
    expect(fair).not.toBeNull()
    expect(fair?.point).toBeLessThan(good?.point ?? Infinity)
  })

  it('falls back to the median when there are too few comps for a percentile spread', () => {
    const result = computeSalePrice([50], 'new')
    expect(result?.low).toBe(result?.point)
    expect(result?.high).toBe(result?.point)
  })
})

describe('computeLiquidationPrice', () => {
  it('returns null with no comps', () => {
    expect(computeLiquidationPrice([], 'good')).toBeNull()
  })

  it('is lower than the sale price point estimate for the same comps/condition', () => {
    const comps = [20, 40, 60, 80, 100]
    const sale = computeSalePrice(comps, 'good')
    const liquidation = computeLiquidationPrice(comps, 'good')
    expect(sale).not.toBeNull()
    expect(liquidation).toBeLessThan(sale?.point ?? -Infinity)
  })
})

describe('computePriceVariance', () => {
  it('returns null with no comps', () => {
    expect(computePriceVariance([])).toBeNull()
  })

  it('returns a low value for tightly clustered comps', () => {
    const variance = computePriceVariance([100, 101, 99, 100, 100])
    expect(variance).not.toBeNull()
    expect(variance).toBeLessThan(0.1)
  })

  it('returns a higher value for widely scattered comps', () => {
    const variance = computePriceVariance([10, 50, 90, 130, 170])
    expect(variance).not.toBeNull()
    expect(variance).toBeGreaterThan(0.5)
  })

  it('clamps to a maximum of 1', () => {
    const variance = computePriceVariance([1, 1000])
    expect(variance).toBeLessThanOrEqual(1)
  })
})

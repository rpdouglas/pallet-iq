import { describe, expect, it } from 'vitest'
import {
  calculateLandedCost,
  calculateLandedCostMultiplier,
  calculateTotalPurchaseValue,
} from './landedCost'

describe('calculateTotalPurchaseValue', () => {
  it('sums unitCost * quantity across line items', () => {
    expect(
      calculateTotalPurchaseValue([
        { unitCost: 10, quantity: 2 }, // 20
        { unitCost: 5, quantity: 4 }, // 20
      ]),
    ).toBe(40)
  })

  it('returns 0 for no line items', () => {
    expect(calculateTotalPurchaseValue([])).toBe(0)
  })
})

describe('calculateLandedCostMultiplier', () => {
  it('computes a uniform markup from freight + fees as a share of total value', () => {
    expect(calculateLandedCostMultiplier(100, 20, 5)).toBeCloseTo(1.25)
  })

  it('returns 1x (no markup) when there is no freight or fees', () => {
    expect(calculateLandedCostMultiplier(100, 0, 0)).toBe(1)
  })

  it('short-circuits to 1x when total purchase value is zero, avoiding division by zero', () => {
    expect(calculateLandedCostMultiplier(0, 50, 10)).toBe(1)
  })

  it('short-circuits to 1x when total purchase value is negative', () => {
    expect(calculateLandedCostMultiplier(-10, 50, 10)).toBe(1)
  })
})

describe('calculateLandedCost', () => {
  it('applies the multiplier to unit cost', () => {
    expect(calculateLandedCost(10, 1.25)).toBeCloseTo(12.5)
  })
})

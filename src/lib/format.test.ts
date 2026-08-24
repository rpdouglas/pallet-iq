import { describe, expect, it } from 'vitest'
import { computeMarginPct, formatMoney } from './format'

describe('formatMoney', () => {
  it('formats a value to 2 decimal places with a dollar sign', () => {
    expect(formatMoney(599)).toBe('$599.00')
    expect(formatMoney(89.99)).toBe('$89.99')
  })

  it('renders an em dash for a null value', () => {
    expect(formatMoney(null)).toBe('—')
  })
})

describe('computeMarginPct', () => {
  it('computes (msrp - price) / msrp as a rounded percent', () => {
    expect(computeMarginPct(199.99, 89.99)).toBe(55)
    expect(computeMarginPct(100, 25)).toBe(75)
  })

  it('rounds to the nearest integer', () => {
    expect(computeMarginPct(300, 199)).toBe(34) // 33.67 -> 34
  })

  it('returns null when msrp is null', () => {
    expect(computeMarginPct(null, 50)).toBeNull()
  })

  it('returns null when price is null', () => {
    expect(computeMarginPct(100, null)).toBeNull()
  })

  it('returns null when msrp is 0, avoiding a divide-by-zero result', () => {
    expect(computeMarginPct(0, 0)).toBeNull()
  })
})

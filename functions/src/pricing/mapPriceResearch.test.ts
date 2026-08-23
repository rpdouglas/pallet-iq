import { describe, expect, it } from 'vitest'
import {
  buildSaleabilityInputs,
  computePriceVariance,
  mapPriceResearchToPricingResult,
} from './mapPriceResearch'
import type { PriceResearchResponse } from './priceResearch'

const CANDIDATE = {
  itemName: 'DeWalt 20V Cordless Drill',
  brand: 'DeWalt',
  model: 'DCD777',
  category: 'Tools',
  dimensions: null,
  notableFeatures: null,
  condition: 'good' as const,
  conditionJustification: 'Light wear.',
  confidence: 0.9,
  barcodeNumber: '885911234567',
  groundedRetailPrice: 179.99,
  groundedRetailSource: 'canadiantire.ca',
}

const FULL_RESPONSE: PriceResearchResponse = {
  retail: { priceCad: 179.99, source: 'canadiantire.ca', url: 'https://canadiantire.ca/x' },
  kijiji: {
    newSealed: {
      low: 130,
      high: 150,
      sampleSize: 3,
      examples: [
        { title: 'DeWalt DCD drill new #1', priceCad: 135, url: 'https://kijiji.ca/1' },
        { title: 'DeWalt DCD drill new #2', priceCad: 145, url: 'https://kijiji.ca/2' },
      ],
    },
    used: {
      low: 80,
      high: 110,
      sampleSize: 5,
      examples: [{ title: 'DeWalt DCD drill used', priceCad: 95, url: 'https://kijiji.ca/3' }],
    },
  },
  ebaySold: {
    priceCad: 105,
    sampleSize: 4,
    thin: false,
    exchangeRateUsed: 1.35,
    examples: [
      { title: 'DeWalt DCD sold #1', priceCad: 100, url: 'https://ebay.ca/1' },
      { title: 'DeWalt DCD sold #2', priceCad: 110, url: 'https://ebay.ca/2' },
    ],
  },
  openBox: { priceCad: 145, basis: 'calculated' },
  bottomLine: { priceCad: 100, low: 85, high: 115, rationale: 'Anchored on eBay sold comps.' },
  dataQuality: { flags: [] },
}

const THIN_RESPONSE: PriceResearchResponse = {
  retail: { priceCad: null, source: null, url: null },
  kijiji: {
    newSealed: { low: null, high: null, sampleSize: 0, examples: [] },
    used: { low: null, high: null, sampleSize: 0, examples: [] },
  },
  ebaySold: { priceCad: null, sampleSize: 0, thin: true, exchangeRateUsed: null, examples: [] },
  openBox: { priceCad: null, basis: null },
  bottomLine: { priceCad: 20, low: 15, high: 25, rationale: 'Best-effort estimate, thin data.' },
  dataQuality: { flags: ['No sources returned usable data'] },
}

describe('computePriceVariance', () => {
  it('returns null for an empty array', () => {
    expect(computePriceVariance([])).toBeNull()
  })

  it('returns 0 for identical prices (no spread)', () => {
    expect(computePriceVariance([50, 50, 50])).toBe(0)
  })

  it('returns a higher value for a wider spread', () => {
    const tight = computePriceVariance([98, 100, 102]) ?? -1
    const wide = computePriceVariance([10, 100, 500]) ?? -1
    expect(tight).toBeGreaterThanOrEqual(0)
    expect(wide).toBeGreaterThan(tight)
  })
})

describe('mapPriceResearchToPricingResult', () => {
  it('maps retail/bottomLine/openBox onto msrp/salePrice/liquidationPrice', () => {
    const result = mapPriceResearchToPricingResult(FULL_RESPONSE, CANDIDATE)
    expect(result.msrp).toBe(179.99)
    expect(result.salePrice).toBe(100)
    expect(result.salePriceLow).toBe(85)
    expect(result.salePriceHigh).toBe(115)
    expect(result.liquidationPrice).toBe(145)
  })

  it('flattens kijiji + ebay examples into comps, tagged by source', () => {
    const result = mapPriceResearchToPricingResult(FULL_RESPONSE, CANDIDATE)
    expect(result.comps).toHaveLength(5)
    expect(result.comps.filter((c) => c.source === 'kijiji_new')).toHaveLength(2)
    expect(result.comps.filter((c) => c.source === 'kijiji_used')).toHaveLength(1)
    expect(result.comps.filter((c) => c.source === 'ebay_sold')).toHaveLength(2)
    expect(result.sampleSize).toBe(5)
  })

  it('caps the displayed comps array at 10 even if sampleSize is higher', () => {
    const manyExamples = Array.from({ length: 12 }, (_, i) => ({
      title: `Comp ${i.toString()}`,
      priceCad: 50 + i,
      url: null,
    }))
    const response: PriceResearchResponse = {
      ...FULL_RESPONSE,
      kijiji: {
        newSealed: { low: 50, high: 61, sampleSize: 12, examples: manyExamples },
        used: { low: null, high: null, sampleSize: 0, examples: [] },
      },
    }
    const result = mapPriceResearchToPricingResult(response, CANDIDATE)
    // 12 kijiji new/sealed + 0 used + 2 eBay sold (from FULL_RESPONSE) = 14 total.
    expect(result.sampleSize).toBe(14)
    expect(result.comps).toHaveLength(10)
  })

  it('includes a rationale factor first, and a condition factor', () => {
    const result = mapPriceResearchToPricingResult(FULL_RESPONSE, CANDIDATE)
    expect(result.factors[0]).toEqual(
      expect.objectContaining({
        label: 'Recommended price rationale',
        explanation: 'Anchored on eBay sold comps.',
      }),
    )
    expect(result.factors.some((f) => f.label === 'Condition: good')).toBe(true)
  })

  it('adds a down-direction factor per dataQuality flag', () => {
    const result = mapPriceResearchToPricingResult(THIN_RESPONSE, CANDIDATE)
    expect(result.factors).toContainEqual({
      label: 'No sources returned usable data',
      direction: 'down',
      explanation: null,
    })
  })

  it('flags thin/unavailable eBay sold data honestly, distinct from "no comps at all"', () => {
    const result = mapPriceResearchToPricingResult(THIN_RESPONSE, CANDIDATE)
    expect(result.factors).toContainEqual(
      expect.objectContaining({
        label: 'eBay sold listings thin or unavailable',
        direction: 'down',
      }),
    )
    expect(result.waterfallStepsUsed).not.toContain('ebay_sold')
  })

  it('still reports a specific bottom-line price even with a thin/no-signal response', () => {
    const result = mapPriceResearchToPricingResult(THIN_RESPONSE, CANDIDATE)
    expect(result.salePrice).toBe(20)
    expect(result.msrp).toBeNull()
    expect(result.sampleSize).toBe(0)
    expect(result.comps).toEqual([])
  })

  it('populates waterfallStepsUsed with the sources that actually returned data', () => {
    const result = mapPriceResearchToPricingResult(FULL_RESPONSE, CANDIDATE)
    expect(result.waterfallStepsUsed).toEqual([
      'retail',
      'kijiji_new',
      'kijiji_used',
      'ebay_sold',
      'open_box',
    ])
  })

  it('gives a higher confidence to a real, non-thin eBay-sold-backed result than a thin one', () => {
    const rich = mapPriceResearchToPricingResult(FULL_RESPONSE, CANDIDATE)
    const thin = mapPriceResearchToPricingResult(THIN_RESPONSE, CANDIDATE)
    expect(rich.confidence).toBeGreaterThan(thin.confidence)
    expect(thin.confidence).toBe(0)
  })
})

describe('buildSaleabilityInputs', () => {
  it('always reports salesRank as null (no specialist source exists anymore)', () => {
    const inputs = buildSaleabilityInputs(FULL_RESPONSE, CANDIDATE)
    expect(inputs.salesRank).toBeNull()
  })

  it('sums kijiji new+used sample sizes into listingCount, excluding eBay sold', () => {
    const inputs = buildSaleabilityInputs(FULL_RESPONSE, CANDIDATE)
    expect(inputs.listingCount).toBe(3 + 5)
  })

  it('derives sampleSize from the same comp pool as PricingResult.sampleSize', () => {
    const pricing = mapPriceResearchToPricingResult(FULL_RESPONSE, CANDIDATE)
    const saleability = buildSaleabilityInputs(FULL_RESPONSE, CANDIDATE)
    expect(saleability.sampleSize).toBe(pricing.sampleSize)
  })

  it('computes a non-null priceVariance when comps exist, null when none do', () => {
    expect(buildSaleabilityInputs(FULL_RESPONSE, CANDIDATE).priceVariance).not.toBeNull()
    expect(buildSaleabilityInputs(THIN_RESPONSE, CANDIDATE).priceVariance).toBeNull()
  })

  it('passes the candidate condition through unchanged', () => {
    const inputs = buildSaleabilityInputs(FULL_RESPONSE, { ...CANDIDATE, condition: 'fair' })
    expect(inputs.condition).toBe('fair')
  })
})

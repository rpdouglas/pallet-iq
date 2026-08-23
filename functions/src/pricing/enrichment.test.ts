import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ItemScanCandidate } from '../item-scans/types'
import type { PricingResult } from './types'

const mockLookupKeepa = vi.fn()
vi.mock('./keepa', () => ({ lookupKeepa: mockLookupKeepa }))

const mockLookupPriceCharting = vi.fn()
vi.mock('./priceCharting', () => ({ lookupPriceCharting: mockLookupPriceCharting }))

const mockLookupDiscogs = vi.fn()
vi.mock('./discogs', () => ({ lookupDiscogs: mockLookupDiscogs }))

const mockLookupGoogleBooks = vi.fn()
vi.mock('./googleBooks', () => ({ lookupGoogleBooks: mockLookupGoogleBooks }))

const { runEnrichment } = await import('./enrichment')

const BASE_CANDIDATE: ItemScanCandidate = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: null,
  notableFeatures: null,
  condition: 'good',
  conditionJustification: 'Fine.',
  confidence: 0.9,
  barcodeNumber: '012345678905',
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const EXISTING_PRICING: PricingResult = {
  msrp: 100,
  salePrice: 70,
  salePriceLow: 60,
  salePriceHigh: 80,
  liquidationPrice: 30,
  confidence: 0.5,
  sampleSize: 3,
  factors: [{ label: 'Condition: good', direction: 'neutral', explanation: null }],
  comps: [
    { title: 'A', price: 60, url: null },
    { title: 'B', price: 70, url: null },
    { title: 'C', price: 80, url: null },
  ],
  waterfallStepsUsed: ['ebay'],
}

const NO_DEPS = { keepaApiKey: null, priceChartingApiKey: null }

function resetMocks() {
  mockLookupKeepa.mockReset()
  mockLookupPriceCharting.mockReset()
  mockLookupDiscogs.mockReset()
  mockLookupGoogleBooks.mockReset()
}

describe('runEnrichment', () => {
  beforeEach(resetMocks)

  it('returns the existing pricing unchanged when no specialist step applies', async () => {
    const result = await runEnrichment(BASE_CANDIDATE, EXISTING_PRICING, NO_DEPS)

    expect(result.pricing).toBe(EXISTING_PRICING)
    expect(result.salesRank).toBeNull()
    expect(mockLookupKeepa).not.toHaveBeenCalled()
  })

  it('runs Keepa for electronics and folds the buy box price into a refined msrp', async () => {
    mockLookupKeepa.mockResolvedValueOnce({ salesRank: 4200, buyBoxPrice: 110 })

    const result = await runEnrichment(BASE_CANDIDATE, EXISTING_PRICING, {
      keepaApiKey: 'key',
      priceChartingApiKey: null,
    })

    expect(mockLookupKeepa).toHaveBeenCalledWith('key', '012345678905')
    expect(result.salesRank).toBe(4200)
    expect(result.pricing.msrp).toBe(105) // average of existing 100 and new 110
    expect(result.pricing.waterfallStepsUsed).toContain('keepa')
    expect(result.pricing.factors.length).toBeGreaterThan(EXISTING_PRICING.factors.length)
  })

  it('does not run Keepa when no API key is configured', async () => {
    await runEnrichment(BASE_CANDIDATE, EXISTING_PRICING, NO_DEPS)

    expect(mockLookupKeepa).not.toHaveBeenCalled()
  })

  it('runs PriceCharting for games and folds cib price into the comp pool', async () => {
    mockLookupPriceCharting.mockResolvedValueOnce({
      productName: 'EarthBound',
      cibPrice: 90,
      newPrice: null,
      loosePrice: 40,
    })

    const result = await runEnrichment(
      { ...BASE_CANDIDATE, category: 'Video Games' },
      EXISTING_PRICING,
      { keepaApiKey: null, priceChartingApiKey: 'token' },
    )

    expect(mockLookupPriceCharting).toHaveBeenCalledWith('token', '012345678905')
    expect(result.pricing.sampleSize).toBe(4) // 3 existing comps + 1 new
    expect(result.pricing.waterfallStepsUsed).toContain('pricecharting')
  })

  it('runs Google Books for book media when a barcode (ISBN) is present', async () => {
    mockLookupGoogleBooks.mockResolvedValueOnce({ title: 'Atomic Habits', listPrice: 27 })

    const result = await runEnrichment(
      { ...BASE_CANDIDATE, category: 'Books', barcodeNumber: '9780735211292' },
      EXISTING_PRICING,
      NO_DEPS,
    )

    expect(mockLookupGoogleBooks).toHaveBeenCalledWith('9780735211292')
    expect(result.pricing.waterfallStepsUsed).toContain('googlebooks')
  })

  it('runs Discogs for non-book media', async () => {
    mockLookupDiscogs.mockResolvedValueOnce({ numForSale: 12, lowestPrice: 25 })

    const result = await runEnrichment(
      { ...BASE_CANDIDATE, category: 'Vinyl Records', barcodeNumber: null },
      EXISTING_PRICING,
      NO_DEPS,
    )

    expect(mockLookupDiscogs).toHaveBeenCalledWith('Instant Pot Instant Pot Duo 6-Quart')
    expect(result.pricing.waterfallStepsUsed).toContain('discogs')
    expect(result.pricing.sampleSize).toBe(4)
  })

  it('tolerates a specialist lookup throwing and returns the existing pricing', async () => {
    mockLookupKeepa.mockRejectedValueOnce(new Error('Keepa is down'))

    const result = await runEnrichment(BASE_CANDIDATE, EXISTING_PRICING, {
      keepaApiKey: 'key',
      priceChartingApiKey: null,
    })

    expect(result.pricing).toBe(EXISTING_PRICING)
    expect(result.salesRank).toBeNull()
  })

  it('never runs a specialist step for the fashion profile', async () => {
    await runEnrichment({ ...BASE_CANDIDATE, category: 'Sneakers' }, EXISTING_PRICING, {
      keepaApiKey: 'key',
      priceChartingApiKey: 'token',
    })

    expect(mockLookupKeepa).not.toHaveBeenCalled()
    expect(mockLookupPriceCharting).not.toHaveBeenCalled()
    expect(mockLookupDiscogs).not.toHaveBeenCalled()
    expect(mockLookupGoogleBooks).not.toHaveBeenCalled()
  })
})

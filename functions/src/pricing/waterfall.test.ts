import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ItemScanCandidate } from '../item-scans/types'

const mockCacheGet = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const mockCacheSet = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const mockDoc = vi.fn(() => ({ get: mockCacheGet, set: mockCacheSet }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockLookupUpc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('./upcLookup', () => ({ lookupUpc: mockLookupUpc }))

const mockSearchActiveListings = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('./ebayBrowseApi', () => ({ searchActiveListings: mockSearchActiveListings }))

const { runWaterfall, PRICING_CONFIDENCE_THRESHOLD } = await import('./waterfall')

const BASE_CANDIDATE: ItemScanCandidate = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: null,
  notableFeatures: null,
  condition: 'good',
  conditionJustification: 'Minor wear.',
  confidence: 0.9,
  barcodeNumber: null,
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const NO_DEPS = { ebayAppId: null, ebayCertId: null }

function resetMocks() {
  mockCacheGet.mockReset().mockResolvedValue({ exists: false })
  mockCacheSet.mockReset()
  mockDoc.mockClear()
  mockLookupUpc.mockReset()
  mockSearchActiveListings.mockReset()
}

describe('runWaterfall', () => {
  beforeEach(resetMocks)

  it('returns a fresh cache hit immediately without running any steps', async () => {
    mockCacheGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        pricing: {
          msrp: 100,
          salePrice: 70,
          salePriceLow: 60,
          salePriceHigh: 80,
          liquidationPrice: 30,
          confidence: 0.9,
          sampleSize: 5,
          factors: [],
          comps: [],
          waterfallStepsUsed: ['ebay'],
        },
        updatedAt: { toMillis: () => Date.now() },
      }),
    })

    const result = await runWaterfall(BASE_CANDIDATE, NO_DEPS)

    expect(result?.waterfallStepsUsed).toEqual(['cache'])
    expect(mockLookupUpc).not.toHaveBeenCalled()
    expect(mockSearchActiveListings).not.toHaveBeenCalled()
  })

  it('ignores a stale cache entry and runs the waterfall instead', async () => {
    mockCacheGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        pricing: {
          msrp: 100,
          salePrice: 70,
          salePriceLow: 60,
          salePriceHigh: 80,
          liquidationPrice: 30,
          confidence: 0.9,
          sampleSize: 5,
          factors: [],
          comps: [],
          waterfallStepsUsed: ['ebay'],
        },
        updatedAt: { toMillis: () => Date.now() - 31 * 24 * 60 * 60 * 1000 },
      }),
    })
    mockSearchActiveListings.mockResolvedValueOnce([{ title: 'x', price: 50, url: null }])

    const result = await runWaterfall(BASE_CANDIDATE, NO_DEPS)

    expect(result?.waterfallStepsUsed).not.toEqual(['cache'])
  })

  it('uses the UPC step when a barcode is present and stops early once confident', async () => {
    mockLookupUpc.mockResolvedValueOnce({
      title: 'Instant Pot Duo',
      brand: 'Instant Pot',
      category: 'Kitchen',
      medianOfferPrice: 89.99,
    })

    const result = await runWaterfall({ ...BASE_CANDIDATE, barcodeNumber: '012345678905' }, NO_DEPS)

    expect(mockLookupUpc).toHaveBeenCalledWith('012345678905')
    expect(result?.waterfallStepsUsed).toEqual(['upc'])
    expect(result?.msrp).toBe(89.99)
    // electronics profile is upc -> grounding -> ebay; upc alone clears
    // the threshold (0.75 >= 0.6) so grounding/ebay are never reached.
    expect(mockSearchActiveListings).not.toHaveBeenCalled()
  })

  it('falls through to eBay when upc/grounding find nothing, for the electronics profile', async () => {
    mockLookupUpc.mockResolvedValueOnce(null)
    mockSearchActiveListings.mockResolvedValueOnce([
      { title: 'A', price: 50, url: 'https://ebay.com/a' },
      { title: 'B', price: 60, url: 'https://ebay.com/b' },
    ])

    const result = await runWaterfall(
      { ...BASE_CANDIDATE, barcodeNumber: '012345678905' },
      { ebayAppId: 'app', ebayCertId: 'cert' },
    )

    expect(mockSearchActiveListings).toHaveBeenCalledWith('app', 'cert', 'Instant Pot Duo60')
    expect(result?.waterfallStepsUsed).toEqual(['ebay'])
    expect(result?.sampleSize).toBe(2)
    expect(result?.salePrice).not.toBeNull()
  })

  it('skips the ebay step for the fashion category profile', async () => {
    const result = await runWaterfall(
      {
        ...BASE_CANDIDATE,
        category: 'Sneakers',
        groundedRetailPrice: 120,
        groundedRetailSource: 'nike.com',
      },
      { ebayAppId: 'app', ebayCertId: 'cert' },
    )

    expect(mockSearchActiveListings).not.toHaveBeenCalled()
    expect(result?.waterfallStepsUsed).toEqual(['grounding'])
    expect(result?.msrp).toBe(120)
  })

  it('does not attempt the ebay step when credentials are not configured', async () => {
    await runWaterfall(
      { ...BASE_CANDIDATE, groundedRetailPrice: 50, groundedRetailSource: 'x.com' },
      NO_DEPS,
    )

    expect(mockSearchActiveListings).not.toHaveBeenCalled()
  })

  it('tolerates an eBay failure and still returns whatever signal was already found', async () => {
    mockLookupUpc.mockResolvedValueOnce(null)
    mockSearchActiveListings.mockRejectedValueOnce(new Error('eBay is down'))

    const result = await runWaterfall(
      {
        ...BASE_CANDIDATE,
        barcodeNumber: '012345678905',
        groundedRetailPrice: 75,
        groundedRetailSource: 'x.com',
      },
      { ebayAppId: 'app', ebayCertId: 'cert' },
    )

    expect(result?.msrp).toBe(75)
    expect(result?.waterfallStepsUsed).toEqual(['grounding'])
  })

  it('returns null when no step produces any signal (the "unknown" outcome)', async () => {
    mockLookupUpc.mockResolvedValueOnce(null)
    mockSearchActiveListings.mockResolvedValueOnce([])

    const result = await runWaterfall(
      { ...BASE_CANDIDATE, barcodeNumber: '012345678905' },
      { ebayAppId: 'app', ebayCertId: 'cert' },
    )

    expect(result).toBeNull()
    expect(mockCacheSet).not.toHaveBeenCalled()
  })

  it('writes a successful result through to the cache', async () => {
    mockSearchActiveListings.mockResolvedValueOnce([{ title: 'A', price: 50, url: null }])

    await runWaterfall(
      { ...BASE_CANDIDATE, category: 'Games' },
      { ebayAppId: 'app', ebayCertId: 'cert' },
    )

    expect(mockDoc).toHaveBeenCalledWith(
      'product_price_cache/fp:instant pot|duo60|instant pot duo 6-quart',
    )
    const cacheWriteArgs = mockCacheSet.mock.calls[0]?.[0] as {
      pricing: { waterfallStepsUsed: string[] }
    }
    expect(cacheWriteArgs.pricing.waterfallStepsUsed).toEqual(['ebay'])
  })

  it('exposes a confidence threshold between 0 and 1', () => {
    expect(PRICING_CONFIDENCE_THRESHOLD).toBeGreaterThan(0)
    expect(PRICING_CONFIDENCE_THRESHOLD).toBeLessThan(1)
  })
})

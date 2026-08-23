import { describe, expect, it, vi } from 'vitest'
import type { ProductPriceCacheDoc } from '../pricing/types'
import type { ItemScanDoc } from './types'

const mockUpdate = vi.fn()
const mockGet = vi.fn()
const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()
const mockDoc = vi.fn((path: string) => {
  if (path.startsWith('product_price_cache/')) {
    return { get: mockCacheGet, set: mockCacheSet }
  }
  return { get: mockGet, update: mockUpdate }
})
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockResearchPrice = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('../pricing/priceResearch', () => ({ researchPrice: mockResearchPrice }))

vi.mock('../gemini/params', () => ({ geminiApiKey: { value: () => 'fake-key' } }))

const { priceItemScanWorker } = await import('./priceItemScanWorker')

function request(data: unknown) {
  return { data } as never
}

const CANDIDATE = {
  itemName: 'DeWalt Drill',
  brand: 'DeWalt',
  model: 'DCD777',
  category: 'Tools',
  dimensions: null,
  notableFeatures: null,
  condition: 'good' as const,
  conditionJustification: 'Light wear.',
  confidence: 0.9,
  barcodeNumber: '885911234567',
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const COMPLETED_SCAN = {
  selectedCandidateIndex: 0,
  candidates: [CANDIDATE],
}

const FULL_RESEARCH_RESPONSE = {
  retail: { priceCad: 180, source: 'canadiantire.ca', url: null },
  kijiji: {
    newSealed: { low: 130, high: 150, sampleSize: 2, examples: [] },
    used: { low: 80, high: 110, sampleSize: 1, examples: [] },
  },
  ebaySold: { priceCad: 100, sampleSize: 4, thin: false, exchangeRateUsed: 1.35, examples: [] },
  openBox: { priceCad: 145, basis: 'calculated' as const },
  bottomLine: { priceCad: 100, low: 85, high: 115, rationale: 'Anchored on eBay sold comps.' },
  dataQuality: { flags: [] },
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockCacheGet.mockReset()
  mockCacheSet.mockReset()
  mockDoc.mockClear()
  mockResearchPrice.mockReset()
}

describe('priceItemScanWorker', () => {
  it('logs and returns early on an invalid payload rather than throwing', async () => {
    resetMocks()
    await expect(priceItemScanWorker.run(request({}))).resolves.toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('marks the scan failed and rethrows when there is no confirmed candidate', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ selectedCandidateIndex: null }) })

    await expect(
      priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow(/confirmed candidate/i)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pricingStatus: 'failed', saleabilityStatus: 'failed' }),
    )
  })

  it('runs price research, computes saleability, and writes both in one update on a cache miss', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPrice.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockResearchPrice).toHaveBeenCalledWith('fake-key', CANDIDATE)
    const cacheSetArg = mockCacheSet.mock.calls[0][0] as ProductPriceCacheDoc
    expect(cacheSetArg.pricing.msrp).toBe(180)
    expect(cacheSetArg.pricing.salePrice).toBe(100)

    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ItemScanDoc>
    expect(updateArg.pricingStatus).toBe('priced')
    expect(updateArg.pricing?.msrp).toBe(180)
    expect(updateArg.saleabilityStatus).toBe('scored')
    expect(typeof updateArg.saleabilityScore?.score).toBe('number')
  })

  it('skips the research call on a fresh cache hit', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    const cachedPricing = {
      msrp: 180,
      salePrice: 100,
      salePriceLow: 85,
      salePriceHigh: 115,
      liquidationPrice: 145,
      confidence: 0.65,
      sampleSize: 3,
      factors: [],
      comps: [{ title: 'x', price: 100, url: null, source: 'ebay_sold' as const }],
      waterfallStepsUsed: ['retail', 'ebay_sold'],
    }
    mockCacheGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ pricing: cachedPricing, updatedAt: { toMillis: () => Date.now() } }),
    })

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockResearchPrice).not.toHaveBeenCalled()
    expect(mockCacheSet).not.toHaveBeenCalled()
    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ItemScanDoc>
    expect(updateArg.pricingStatus).toBe('priced')
    expect(updateArg.pricing?.waterfallStepsUsed).toEqual(['cache'])
    expect(updateArg.saleabilityStatus).toBe('scored')
  })

  it('treats a stale (expired TTL) cache entry as a miss and re-researches', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
    mockCacheGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        pricing: { ...FULL_RESEARCH_RESPONSE, comps: [], factors: [], waterfallStepsUsed: [] },
        updatedAt: { toMillis: () => Date.now() - THIRTY_ONE_DAYS_MS },
      }),
    })
    mockResearchPrice.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockResearchPrice).toHaveBeenCalled()
    expect(mockCacheSet).toHaveBeenCalled()
  })

  it('marks the scan failed and rethrows when research itself fails', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPrice.mockRejectedValueOnce(new Error('Gemini timed out'))

    await expect(
      priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow('Gemini timed out')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        pricingStatus: 'failed',
        pricingError: 'Gemini timed out',
        saleabilityStatus: 'failed',
        saleabilityError: 'Gemini timed out',
      }),
    )
  })
})

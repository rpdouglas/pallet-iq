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

const mockResearchPricingLegs = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const mockSynthesizePricing = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('../pricing/priceResearch', () => ({
  researchPricingLegs: mockResearchPricingLegs,
  synthesizePricing: mockSynthesizePricing,
}))

const mockVerifyPricingComps = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('../pricing/verifyComps', () => ({ verifyPricingComps: mockVerifyPricingComps }))

vi.mock('../gemini/params', () => ({ geminiApiKey: { value: () => 'fake-key' } }))

vi.mock('../billing/geminiUsage', () => ({
  recordGeminiCalls: vi.fn(() => Promise.resolve()),
}))

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
  pricingResearchLegs: null,
}

const MERGED_LEGS = {
  retail: { priceCad: 180, source: 'canadiantire.ca', url: null },
  openBox: { priceCad: 145, basis: 'calculated' as const },
  kijiji: {
    newSealed: { low: 130, high: 150, sampleSize: 2, examples: [] },
    used: { low: 80, high: 110, sampleSize: 1, examples: [] },
  },
  ebaySold: { priceCad: 100, sampleSize: 4, thin: false, exchangeRateUsed: 1.35, examples: [] },
}

const LEGS_RESULT = {
  merged: MERGED_LEGS,
  legs: {
    retailOpenBox: { retail: MERGED_LEGS.retail, openBox: MERGED_LEGS.openBox },
    kijiji: MERGED_LEGS.kijiji,
    ebaySold: MERGED_LEGS.ebaySold,
  },
  legFailureFlags: [],
  callsMade: 3,
}

const FULL_RESEARCH_RESPONSE = {
  ...MERGED_LEGS,
  bottomLine: { priceCad: 100, low: 85, high: 115, rationale: 'Anchored on eBay sold comps.' },
  dataQuality: { flags: [] },
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockCacheGet.mockReset()
  mockCacheSet.mockReset()
  mockDoc.mockClear()
  mockResearchPricingLegs.mockReset()
  mockSynthesizePricing.mockReset()
  mockVerifyPricingComps.mockReset()
  // Passthrough default - most tests don't care about comp verification
  // specifically; the dedicated test below overrides this per-case.
  mockVerifyPricingComps.mockImplementation((pricing: unknown) => Promise.resolve(pricing))
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
    mockResearchPricingLegs.mockResolvedValueOnce(LEGS_RESULT)
    mockSynthesizePricing.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockResearchPricingLegs).toHaveBeenCalledWith('fake-key', CANDIDATE, null)
    expect(mockSynthesizePricing).toHaveBeenCalledWith('fake-key', CANDIDATE, MERGED_LEGS, [])
    const cacheSetArg = mockCacheSet.mock.calls[0][0] as ProductPriceCacheDoc
    expect(cacheSetArg.pricing.msrp).toBe(180)
    expect(cacheSetArg.pricing.salePrice).toBe(100)

    // Two scan-doc updates on a cache miss: the interim leg-persistence
    // write (PALLETIQ-045), then the final pricing/saleability write.
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    const legsUpdateArg = mockUpdate.mock.calls[0][0] as Partial<ItemScanDoc>
    expect(legsUpdateArg.pricingResearchLegs).toEqual(LEGS_RESULT.legs)

    const updateArg = mockUpdate.mock.calls[1][0] as Partial<ItemScanDoc>
    expect(updateArg.pricingStatus).toBe('priced')
    expect(updateArg.pricing?.msrp).toBe(180)
    expect(updateArg.pricingResearchLegs).toBeNull()
    expect(updateArg.saleabilityStatus).toBe('scored')
    expect(typeof updateArg.saleabilityScore?.score).toBe('number')

    // PALLETIQ-037: comp URLs are verified before being cached or stored.
    expect(mockVerifyPricingComps).toHaveBeenCalledWith(
      expect.objectContaining({ msrp: 180, salePrice: 100 }),
    )
  })

  it("passes the scan doc's previously-persisted legs through to researchPricingLegs", async () => {
    resetMocks()
    const previousLegs = {
      retailOpenBox: { retail: MERGED_LEGS.retail, openBox: MERGED_LEGS.openBox },
      kijiji: null,
      ebaySold: null,
    }
    mockGet.mockResolvedValueOnce({
      data: () => ({ ...COMPLETED_SCAN, pricingResearchLegs: previousLegs }),
    })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPricingLegs.mockResolvedValueOnce({ ...LEGS_RESULT, callsMade: 2 })
    mockSynthesizePricing.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockResearchPricingLegs).toHaveBeenCalledWith('fake-key', CANDIDATE, previousLegs)
  })

  it('caches and stores the verified pricing, not the pre-verification mapped result', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPricingLegs.mockResolvedValueOnce(LEGS_RESULT)
    mockSynthesizePricing.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)
    mockVerifyPricingComps.mockResolvedValueOnce({
      msrp: 180,
      salePrice: 100,
      salePriceLow: 85,
      salePriceHigh: 115,
      liquidationPrice: 145,
      confidence: 0.65,
      sampleSize: 0,
      factors: [
        { label: '1 comp link(s) could not be verified', direction: 'down', explanation: null },
      ],
      comps: [],
      waterfallStepsUsed: ['retail'],
    })

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    const cacheSetArg = mockCacheSet.mock.calls[0][0] as ProductPriceCacheDoc
    const updateArg = mockUpdate.mock.calls[1][0] as Partial<ItemScanDoc>
    expect(cacheSetArg.pricing.factors).toEqual([
      { label: '1 comp link(s) could not be verified', direction: 'down', explanation: null },
    ])
    expect(updateArg.pricing?.factors).toEqual(cacheSetArg.pricing.factors)
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

    expect(mockResearchPricingLegs).not.toHaveBeenCalled()
    expect(mockSynthesizePricing).not.toHaveBeenCalled()
    expect(mockCacheSet).not.toHaveBeenCalled()
    // PALLETIQ-037: a cache hit's comps were already verified at write
    // time - no need to re-verify (and re-fetch) on every hit.
    expect(mockVerifyPricingComps).not.toHaveBeenCalled()
    // A cache hit makes exactly one scan-doc update (no interim leg write
    // - there was nothing new to research).
    expect(mockUpdate).toHaveBeenCalledTimes(1)
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
    mockResearchPricingLegs.mockResolvedValueOnce(LEGS_RESULT)
    mockSynthesizePricing.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockResearchPricingLegs).toHaveBeenCalled()
    expect(mockCacheSet).toHaveBeenCalled()
  })

  it('marks the scan failed and rethrows when the research legs themselves fail', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPricingLegs.mockRejectedValueOnce(new Error('Gemini timed out'))

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
    // Never reached the leg-persistence step, since the legs call itself failed.
    expect(mockSynthesizePricing).not.toHaveBeenCalled()
  })

  it('marks the scan failed and rethrows when synthesis fails, but the legs are already persisted', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPricingLegs.mockResolvedValueOnce(LEGS_RESULT)
    mockSynthesizePricing.mockRejectedValueOnce(new Error('synthesis call failed'))

    await expect(
      priceItemScanWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow('synthesis call failed')

    // The legs were persisted before synthesis was attempted - a Cloud
    // Tasks retry will read them back and skip re-running them.
    const legsUpdateArg = mockUpdate.mock.calls[0][0] as Partial<ItemScanDoc>
    expect(legsUpdateArg.pricingResearchLegs).toEqual(LEGS_RESULT.legs)

    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ pricingStatus: 'failed', pricingError: 'synthesis call failed' }),
    )
  })
})

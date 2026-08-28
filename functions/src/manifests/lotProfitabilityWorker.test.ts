import { describe, expect, it, vi } from 'vitest'
import { SKU_RESEARCH_CAP_BY_PLAN } from './lotProfitability'
import type { ImportDoc } from './types'

const mockUpdate = vi.fn()
const mockImportGet = vi.fn()
const mockLineItemsGet = vi.fn()
const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()
const mockDoc = vi.fn((path: string) => {
  if (path.startsWith('product_price_cache/')) {
    return { get: mockCacheGet, set: mockCacheSet }
  }
  return { get: mockImportGet, update: mockUpdate }
})
const mockCollection = vi.fn(() => ({ get: mockLineItemsGet }))
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn(() => Promise.resolve())
const mockBatch = vi.fn(() => ({ update: mockBatchUpdate, commit: mockBatchCommit }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc, collection: mockCollection, batch: mockBatch }),
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

const mockRecordGeminiCalls = vi.fn(() => Promise.resolve())
const mockGetSubscriptionPlan = vi.fn<(...args: unknown[]) => Promise<string>>()
vi.mock('../billing/geminiUsage', () => ({
  recordGeminiCalls: mockRecordGeminiCalls,
  getSubscriptionPlan: mockGetSubscriptionPlan,
}))

const { lotProfitabilityWorker } = await import('./lotProfitabilityWorker')

function request(data: unknown) {
  return { data } as never
}

const IMPORT_DOC = { status: 'completed', freightCost: 0, otherFees: 0 }

const LINE_ITEM = {
  sku: 'SKU-1',
  upc: '111',
  description: 'DeWalt Drill',
  quantity: 2,
  unitCost: 10,
  condition: null,
  category: 'Tools',
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
  mockImportGet.mockReset()
  mockLineItemsGet.mockReset()
  mockCacheGet.mockReset()
  mockCacheSet.mockReset()
  mockDoc.mockClear()
  mockCollection.mockClear()
  mockBatchUpdate.mockClear()
  mockBatchCommit.mockClear()
  mockBatch.mockClear()
  mockResearchPricingLegs.mockReset()
  mockSynthesizePricing.mockReset()
  mockVerifyPricingComps.mockReset()
  mockRecordGeminiCalls.mockClear()
  mockGetSubscriptionPlan.mockReset()
  // Pro by default so existing tests (all well under even the free-tier
  // cap) aren't affected by PALLETIQ-055's plan-aware SKU_RESEARCH_CAP_BY_PLAN.
  mockGetSubscriptionPlan.mockResolvedValue('pro')
  mockVerifyPricingComps.mockImplementation((pricing: unknown) => Promise.resolve(pricing))
}

describe('lotProfitabilityWorker', () => {
  it('logs and returns early on an invalid payload rather than throwing', async () => {
    resetMocks()
    await expect(lotProfitabilityWorker.run(request({}))).resolves.toBeUndefined()
    expect(mockImportGet).not.toHaveBeenCalled()
  })

  it('marks the import failed and rethrows when it no longer exists', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => undefined })

    await expect(
      lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' })),
    ).rejects.toThrow(/no longer exists/i)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ profitabilityStatus: 'failed' }),
    )
  })

  it('scores a single-SKU lot on a cache miss and writes the aggregate result', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => IMPORT_DOC })
    mockLineItemsGet.mockResolvedValueOnce({
      docs: [{ data: () => LINE_ITEM, ref: { id: 'item-1' } }],
    })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPricingLegs.mockResolvedValueOnce(LEGS_RESULT)
    mockSynthesizePricing.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' }))

    expect(mockCollection).toHaveBeenCalledWith('tenants/tenant-a/manifests/i1/lineItems')
    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ImportDoc>
    expect(updateArg.profitabilityStatus).toBe('scored')
    expect(updateArg.profitability?.totalLandedCost).toBe(20) // 2 units * $10
    expect(updateArg.profitability?.projectedResaleValue).toBe(200) // salePrice 100 * qty 2
    expect(updateArg.profitability?.projectedProfit).toBe(180)
    expect(updateArg.profitability?.skusResearched).toBe(1)
    expect(updateArg.profitability?.skusTotal).toBe(1)
    expect(mockRecordGeminiCalls).toHaveBeenCalledWith('tenant-a', 4) // 3 legs + synthesis
    // PALLETIQ-053: the researched sale price is written back onto the
    // line item doc itself, not just folded into the lot-level aggregate.
    expect(mockBatchUpdate).toHaveBeenCalledWith({ id: 'item-1' }, { liquidationPrice: 100 })
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })

  it('skips research on a fresh cache hit', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => IMPORT_DOC })
    mockLineItemsGet.mockResolvedValueOnce({
      docs: [{ data: () => LINE_ITEM, ref: { id: 'item-1' } }],
    })
    mockCacheGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        pricing: { salePrice: 50 },
        updatedAt: { toMillis: () => Date.now() },
      }),
    })

    await lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' }))

    expect(mockResearchPricingLegs).not.toHaveBeenCalled()
    expect(mockRecordGeminiCalls).toHaveBeenCalledWith('tenant-a', 0)
    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ImportDoc>
    expect(updateArg.profitability?.projectedResaleValue).toBe(100) // 50 * qty 2
  })

  it('treats a stale (expired TTL) cache entry as a miss and re-researches - same 30-day cache refresh interval priceItemScanWorker.ts uses', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => IMPORT_DOC })
    mockLineItemsGet.mockResolvedValueOnce({
      docs: [{ data: () => LINE_ITEM, ref: { id: 'item-1' } }],
    })
    const THIRTY_ONE_DAYS_MS = 31 * 24 * 60 * 60 * 1000
    mockCacheGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        pricing: { salePrice: 999 },
        updatedAt: { toMillis: () => Date.now() - THIRTY_ONE_DAYS_MS },
      }),
    })
    mockResearchPricingLegs.mockResolvedValueOnce(LEGS_RESULT)
    mockSynthesizePricing.mockResolvedValueOnce(FULL_RESEARCH_RESPONSE)

    await lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' }))

    expect(mockResearchPricingLegs).toHaveBeenCalled()
    expect(mockCacheSet).toHaveBeenCalled()
    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ImportDoc>
    expect(updateArg.profitability?.projectedResaleValue).toBe(200) // fresh salePrice 100 * qty 2, not the stale 999
  })

  it("one SKU's research failing degrades that SKU to unresearched instead of failing the whole lot", async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => IMPORT_DOC })
    mockLineItemsGet.mockResolvedValueOnce({
      docs: [{ data: () => LINE_ITEM, ref: { id: 'item-1' } }],
    })
    mockCacheGet.mockResolvedValueOnce({ exists: false })
    mockResearchPricingLegs.mockRejectedValueOnce(new Error('Gemini timed out'))

    await lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' }))

    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ImportDoc>
    expect(updateArg.profitabilityStatus).toBe('scored')
    expect(updateArg.profitability?.skusResearched).toBe(0)
    expect(updateArg.profitability?.projectedResaleValue).toBe(0)
    // PALLETIQ-053: a failed (or, equivalently, never-attempted-past-cap)
    // group still writes an explicit null, not left unset.
    expect(mockBatchUpdate).toHaveBeenCalledWith({ id: 'item-1' }, { liquidationPrice: null })
  })

  it('caps SKU research tighter for a free-tier tenant than a pro one, per SKU_RESEARCH_CAP_BY_PLAN', async () => {
    resetMocks()
    mockGetSubscriptionPlan.mockReset()
    mockGetSubscriptionPlan.mockResolvedValueOnce('free')
    const freeCap = SKU_RESEARCH_CAP_BY_PLAN.free
    const lineItems = Array.from({ length: freeCap + 2 }, (_, i) => ({
      ...LINE_ITEM,
      sku: `SKU-${i.toString()}`,
      unitCost: i + 1, // distinct totalValue so the highest-value-first ordering is deterministic
    }))
    mockImportGet.mockResolvedValueOnce({ data: () => IMPORT_DOC })
    mockLineItemsGet.mockResolvedValueOnce({
      docs: lineItems.map((item, i) => ({ data: () => item, ref: { id: `item-${i.toString()}` } })),
    })
    mockCacheGet.mockResolvedValue({ exists: false })
    mockResearchPricingLegs.mockResolvedValue(LEGS_RESULT)
    mockSynthesizePricing.mockResolvedValue(FULL_RESEARCH_RESPONSE)

    await lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' }))

    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ImportDoc>
    expect(updateArg.profitability?.skusTotal).toBe(freeCap + 2)
    expect(updateArg.profitability?.skusResearched).toBe(freeCap)
  })

  it('marks the import failed and rethrows on a whole-worker failure (line items unreadable)', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => IMPORT_DOC })
    mockLineItemsGet.mockRejectedValueOnce(new Error('Firestore unavailable'))

    await expect(
      lotProfitabilityWorker.run(request({ tenantId: 'tenant-a', importId: 'i1' })),
    ).rejects.toThrow('Firestore unavailable')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        profitabilityStatus: 'failed',
        profitabilityError: 'Firestore unavailable',
      } satisfies Partial<ImportDoc>),
    )
  })
})

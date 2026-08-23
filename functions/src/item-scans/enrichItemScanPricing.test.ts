import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockUpdate = vi.fn()
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn() },
}))

vi.mock('../pricing/params', () => ({
  keepaApiKey: { value: () => 'keepa-key' },
  priceChartingApiKey: { value: () => 'pc-key' },
}))

const mockRunEnrichment = vi.fn()
vi.mock('../pricing/enrichment', () => ({ runEnrichment: mockRunEnrichment }))

const mockComputePriceVariance = vi.fn()
vi.mock('../pricing/computePrices', () => ({ computePriceVariance: mockComputePriceVariance }))

const mockComputeSaleability = vi.fn()
vi.mock('../saleability/computeSaleability', () => ({ computeSaleability: mockComputeSaleability }))

const { enrichItemScanPricing } = await import('./enrichItemScanPricing')

function taskRequest(data: unknown) {
  return { data } as never
}

const CANDIDATE = {
  itemName: 'Instant Pot',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen',
  dimensions: null,
  notableFeatures: null,
  condition: 'good',
  conditionJustification: 'Fine.',
  confidence: 0.9,
  barcodeNumber: '012345678905',
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const PRICED_PRICING = {
  msrp: 100,
  salePrice: 70,
  salePriceLow: 60,
  salePriceHigh: 80,
  liquidationPrice: 30,
  confidence: 0.7,
  sampleSize: 5,
  factors: [],
  comps: [{ title: 'A', price: 70, url: null }],
  waterfallStepsUsed: ['ebay'],
}

const SCAN_DATA = {
  candidates: [CANDIDATE],
  selectedCandidateIndex: 0,
  pricing: PRICED_PRICING,
}

const validPayload = { tenantId: 'tenant-a', scanId: 'scan-1' }

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockGet.mockResolvedValue({ data: () => SCAN_DATA })
  mockDoc.mockClear()
  mockRunEnrichment.mockReset()
  mockRunEnrichment.mockResolvedValue({
    pricing: PRICED_PRICING,
    salesRank: 4200,
    compPrices: [70],
  })
  mockComputePriceVariance.mockReset()
  mockComputePriceVariance.mockReturnValue(0.1)
  mockComputeSaleability.mockReset()
  mockComputeSaleability.mockReturnValue({ score: 0.72, factors: [] })
}

describe('enrichItemScanPricing', () => {
  beforeEach(resetMocks)

  it('logs and returns on an invalid payload without touching Firestore', async () => {
    await enrichItemScanPricing.run(taskRequest({}))

    expect(mockDoc).not.toHaveBeenCalled()
  })

  it('runs enrichment, computes saleability, and writes a scored result', async () => {
    await enrichItemScanPricing.run(taskRequest(validPayload))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/scan-1')
    expect(mockRunEnrichment).toHaveBeenCalledWith(CANDIDATE, PRICED_PRICING, {
      keepaApiKey: 'keepa-key',
      priceChartingApiKey: 'pc-key',
    })
    expect(mockComputeSaleability).toHaveBeenCalledWith({
      priceVariance: 0.1,
      condition: 'good',
      listingCount: 1,
      salesRank: 4200,
      sampleSize: 5,
    })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        pricing: PRICED_PRICING,
        pricingStatus: 'priced',
        saleabilityStatus: 'scored',
        saleabilityScore: { score: 0.72, factors: [] },
      }),
    )
  })

  it('treats a missing existing pricing result as an empty starting point', async () => {
    mockGet.mockResolvedValueOnce({ data: () => ({ ...SCAN_DATA, pricing: null }) })

    await enrichItemScanPricing.run(taskRequest(validPayload))

    expect(mockRunEnrichment).toHaveBeenCalledWith(
      CANDIDATE,
      expect.objectContaining({ msrp: null, comps: [] }),
      expect.anything(),
    )
  })

  it('writes pricingStatus "unknown" when enrichment still finds no signal', async () => {
    mockRunEnrichment.mockResolvedValueOnce({
      pricing: { ...PRICED_PRICING, msrp: null, salePrice: null },
      salesRank: null,
      compPrices: [],
    })

    await enrichItemScanPricing.run(taskRequest(validPayload))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        pricingStatus: 'unknown',
        pricing: null,
        saleabilityStatus: 'scored',
      }),
    )
  })

  it('marks saleabilityStatus failed and rethrows if something throws', async () => {
    mockRunEnrichment.mockRejectedValueOnce(new Error('boom'))

    await expect(enrichItemScanPricing.run(taskRequest(validPayload))).rejects.toThrow('boom')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ saleabilityStatus: 'failed', saleabilityError: 'boom' }),
    )
  })

  it('marks saleabilityStatus failed when the scan has no selected candidate', async () => {
    mockGet.mockResolvedValueOnce({ data: () => ({ ...SCAN_DATA, selectedCandidateIndex: null }) })

    await expect(enrichItemScanPricing.run(taskRequest(validPayload))).rejects.toThrow(
      /confirmed candidate/i,
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ saleabilityStatus: 'failed' }),
    )
  })
})

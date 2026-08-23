import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockUpdate = vi.fn()
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('../pricing/params', () => ({
  ebayAppId: { value: () => 'app-id' },
  ebayCertId: { value: () => 'cert-id' },
}))

const mockRunWaterfall = vi.fn()
vi.mock('../pricing/waterfall', () => ({ runWaterfall: mockRunWaterfall }))

const { priceItemScan } = await import('./priceItemScan')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
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
  barcodeNumber: null,
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const COMPLETED_SCAN = {
  status: 'completed',
  candidates: [CANDIDATE],
  selectedCandidateIndex: 0,
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
  mockRunWaterfall.mockReset()
}

describe('priceItemScan', () => {
  it('rejects an unauthenticated caller', async () => {
    resetMocks()
    await expect(priceItemScan.run(request({ scanId: 's1' }, undefined))).rejects.toThrow(
      /sign in/i,
    )
  })

  it('rejects a caller with no tenantId claim', async () => {
    resetMocks()
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']
    await expect(priceItemScan.run(request({ scanId: 's1' }, noTenantAuth))).rejects.toThrow(
      /tenant membership/i,
    )
  })

  it('rejects a manager (not owner or buyer)', async () => {
    resetMocks()
    await expect(priceItemScan.run(request({ scanId: 's1' }, auth('manager')))).rejects.toThrow(
      /owner or buyer/i,
    )
  })

  it('rejects a missing scanId', async () => {
    resetMocks()
    await expect(priceItemScan.run(request({}, auth('buyer')))).rejects.toThrow(/scanId/i)
  })

  it('rejects a scan that does not exist', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => undefined })
    await expect(priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))).rejects.toThrow(
      /not found/i,
    )
  })

  it('rejects a scan whose identification is not completed', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ status: 'processing', selectedCandidateIndex: null }),
    })
    await expect(priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))).rejects.toThrow(
      /confirmed identification/i,
    )
  })

  it('rejects a scan with no selected candidate (low-confidence, not yet picked)', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ status: 'completed', selectedCandidateIndex: null, candidates: [CANDIDATE] }),
    })
    await expect(priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))).rejects.toThrow(
      /confirmed identification/i,
    )
  })

  it('marks pricing, runs the waterfall, and writes a priced result', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    const pricingResult = {
      msrp: 100,
      salePrice: 70,
      salePriceLow: 60,
      salePriceHigh: 80,
      liquidationPrice: 30,
      confidence: 0.7,
      sampleSize: 5,
      factors: [],
      comps: [],
      waterfallStepsUsed: ['ebay'],
    }
    mockRunWaterfall.mockResolvedValueOnce(pricingResult)

    const result = await priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/s1')
    expect(mockUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pricingStatus: 'pricing' }),
    )
    expect(mockRunWaterfall).toHaveBeenCalledWith(CANDIDATE, {
      ebayAppId: 'app-id',
      ebayCertId: 'cert-id',
    })
    expect(mockUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pricingStatus: 'priced', pricing: pricingResult }),
    )
    expect(result).toEqual({ pricing: pricingResult })
  })

  it('writes pricingStatus "unknown" when the waterfall finds no signal', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockRunWaterfall.mockResolvedValueOnce(null)

    const result = await priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))

    expect(mockUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pricingStatus: 'unknown', pricing: null }),
    )
    expect(result).toEqual({ pricing: null })
  })

  it('marks pricingStatus failed and rethrows if the waterfall throws', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })
    mockRunWaterfall.mockRejectedValueOnce(new Error('boom'))

    await expect(priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))).rejects.toThrow(
      /pricing failed/i,
    )

    expect(mockUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pricingStatus: 'failed', pricingError: 'boom' }),
    )
  })
})

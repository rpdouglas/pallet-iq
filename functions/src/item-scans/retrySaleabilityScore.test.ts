import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'
import type { ItemScanDoc } from './types'

const mockUpdate = vi.fn()
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const { retrySaleabilityScore } = await import('./retrySaleabilityScore')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

const CANDIDATE = {
  itemName: 'DeWalt Drill',
  brand: 'DeWalt',
  model: 'DCD777',
  category: 'Tools',
  dimensions: null,
  notableFeatures: null,
  condition: 'good',
  conditionJustification: 'Light wear.',
  confidence: 0.9,
  barcodeNumber: null,
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const PRICED_SCAN = {
  pricingStatus: 'priced',
  selectedCandidateIndex: 0,
  candidates: [CANDIDATE],
  pricing: {
    msrp: 180,
    salePrice: 100,
    salePriceLow: 85,
    salePriceHigh: 115,
    liquidationPrice: 145,
    confidence: 0.65,
    sampleSize: 2,
    factors: [],
    comps: [
      { title: 'a', price: 95, url: null, source: 'kijiji_used' },
      { title: 'b', price: 105, url: null, source: 'ebay_sold' },
    ],
    waterfallStepsUsed: ['kijiji_used', 'ebay_sold'],
  },
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
}

describe('retrySaleabilityScore', () => {
  it('rejects an unauthenticated caller', async () => {
    resetMocks()
    await expect(retrySaleabilityScore.run(request({ scanId: 's1' }, undefined))).rejects.toThrow(
      /sign in/i,
    )
  })

  it('rejects a caller with no tenantId claim', async () => {
    resetMocks()
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']
    await expect(
      retrySaleabilityScore.run(request({ scanId: 's1' }, noTenantAuth)),
    ).rejects.toThrow(/tenant membership/i)
  })

  it('rejects a manager (not owner or buyer)', async () => {
    resetMocks()
    await expect(
      retrySaleabilityScore.run(request({ scanId: 's1' }, auth('manager'))),
    ).rejects.toThrow(/owner or buyer/i)
  })

  it('rejects a missing scanId', async () => {
    resetMocks()
    await expect(retrySaleabilityScore.run(request({}, auth('buyer')))).rejects.toThrow(/scanId/i)
  })

  it('rejects a scan that does not exist', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => undefined })
    await expect(
      retrySaleabilityScore.run(request({ scanId: 's1' }, auth('buyer'))),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects a scan that has not been priced yet', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ pricingStatus: 'not_priced' }) })
    await expect(
      retrySaleabilityScore.run(request({ scanId: 's1' }, auth('buyer'))),
    ).rejects.toThrow(/needs to be priced/i)
  })

  it('rejects a scan whose pricing itself is still in flight or failed', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ pricingStatus: 'pricing' }) })
    await expect(
      retrySaleabilityScore.run(request({ scanId: 's1' }, auth('buyer'))),
    ).rejects.toThrow(/needs to be priced/i)

    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ pricingStatus: 'failed' }) })
    await expect(
      retrySaleabilityScore.run(request({ scanId: 's1' }, auth('buyer'))),
    ).rejects.toThrow(/needs to be priced/i)
  })

  it('recomputes saleability synchronously from the stored comps for a priced scan, no task enqueue', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => PRICED_SCAN })

    await retrySaleabilityScore.run(request({ scanId: 's1' }, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/s1')
    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ItemScanDoc>
    expect(updateArg.saleabilityStatus).toBe('scored')
    expect(updateArg.saleabilityError).toBeNull()
    expect(typeof updateArg.saleabilityScore?.score).toBe('number')
  })

  it('allows an owner to retry too', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => PRICED_SCAN })

    await retrySaleabilityScore.run(request({ scanId: 's1' }, auth('owner')))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ saleabilityStatus: 'scored' }),
    )
  })
})

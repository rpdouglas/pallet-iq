import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockUpdate = vi.fn()
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockEnqueue = vi.fn()
const mockTaskQueue = vi.fn(() => ({ enqueue: mockEnqueue }))
vi.mock('firebase-admin/functions', () => ({
  getFunctions: () => ({ taskQueue: mockTaskQueue }),
}))

const { retrySaleabilityScore } = await import('./retrySaleabilityScore')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
  mockEnqueue.mockReset()
  mockTaskQueue.mockClear()
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
    expect(mockEnqueue).not.toHaveBeenCalled()
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

  it('resets saleability state and re-enqueues enrichment for a priced scan', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ pricingStatus: 'priced' }) })

    await retrySaleabilityScore.run(request({ scanId: 's1' }, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/s1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ saleabilityStatus: 'scoring', saleabilityError: null }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('enrichItemScanPricing')
    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 's1' })
  })

  it('also allows retrying a scan whose waterfall found no signal ("unknown")', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ pricingStatus: 'unknown' }) })

    await retrySaleabilityScore.run(request({ scanId: 's1' }, auth('owner')))

    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 's1' })
  })
})

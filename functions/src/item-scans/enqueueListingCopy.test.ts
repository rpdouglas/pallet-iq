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

vi.mock('../billing/geminiUsage', () => ({
  checkGeminiCallCap: vi.fn(() => Promise.resolve()),
}))

const { enqueueListingCopy } = await import('./enqueueListingCopy')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

const PRICED_AND_SCORED_SCAN = {
  candidates: [{ itemName: 'Instant Pot' }],
  selectedCandidateIndex: 0,
  pricingStatus: 'priced',
  pricing: { msrp: 100, salePrice: 55 },
  saleabilityStatus: 'scored',
  saleabilityScore: { score: 0.7, factors: [] },
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
  mockEnqueue.mockReset()
  mockTaskQueue.mockClear()
}

describe('enqueueListingCopy', () => {
  it('rejects an unauthenticated caller', async () => {
    resetMocks()
    await expect(enqueueListingCopy.run(request({ scanId: 's1' }, undefined))).rejects.toThrow(
      /sign in/i,
    )
  })

  it('rejects a caller with no tenantId claim', async () => {
    resetMocks()
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']
    await expect(enqueueListingCopy.run(request({ scanId: 's1' }, noTenantAuth))).rejects.toThrow(
      /tenant membership/i,
    )
  })

  it('rejects a buyer (not owner or manager)', async () => {
    resetMocks()
    await expect(enqueueListingCopy.run(request({ scanId: 's1' }, auth('buyer')))).rejects.toThrow(
      /owner or store manager/i,
    )
  })

  it('rejects a warehouse role', async () => {
    resetMocks()
    await expect(
      enqueueListingCopy.run(request({ scanId: 's1' }, auth('warehouse'))),
    ).rejects.toThrow(/owner or store manager/i)
  })

  it('rejects a missing scanId', async () => {
    resetMocks()
    await expect(enqueueListingCopy.run(request({}, auth('manager')))).rejects.toThrow(/scanId/i)
  })

  it('rejects a scan that does not exist', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => undefined })
    await expect(
      enqueueListingCopy.run(request({ scanId: 's1' }, auth('manager'))),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects a scan that is not yet priced', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ ...PRICED_AND_SCORED_SCAN, pricingStatus: 'pricing', pricing: null }),
    })
    await expect(
      enqueueListingCopy.run(request({ scanId: 's1' }, auth('manager'))),
    ).rejects.toThrow(/needs to be priced/i)
  })

  it('rejects a scan with no saleability score yet', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({
        ...PRICED_AND_SCORED_SCAN,
        saleabilityStatus: 'scoring',
        saleabilityScore: null,
      }),
    })
    await expect(
      enqueueListingCopy.run(request({ scanId: 's1' }, auth('manager'))),
    ).rejects.toThrow(/saleability score/i)
  })

  it('rejects a scan with no selected candidate', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ ...PRICED_AND_SCORED_SCAN, selectedCandidateIndex: null }),
    })
    await expect(
      enqueueListingCopy.run(request({ scanId: 's1' }, auth('manager'))),
    ).rejects.toThrow(/confirmed candidate/i)
  })

  it('marks listingCopyStatus "generating" and enqueues the worker for a manager', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => PRICED_AND_SCORED_SCAN })

    await enqueueListingCopy.run(request({ scanId: 's1' }, auth('manager')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/s1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ listingCopyStatus: 'generating', listingCopyError: null }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('listingCopyWorker')
    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 's1' })
  })

  it('allows an owner to generate listing copy too', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => PRICED_AND_SCORED_SCAN })

    await enqueueListingCopy.run(request({ scanId: 's1' }, auth('owner')))

    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 's1' })
  })
})

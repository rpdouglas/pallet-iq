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

const { priceItemScan } = await import('./priceItemScan')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

const COMPLETED_SCAN = {
  status: 'completed',
  candidates: [{ itemName: 'Instant Pot' }],
  selectedCandidateIndex: 0,
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
  mockEnqueue.mockReset()
  mockTaskQueue.mockClear()
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
      data: () => ({ status: 'completed', selectedCandidateIndex: null, candidates: [] }),
    })
    await expect(priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))).rejects.toThrow(
      /confirmed identification/i,
    )
  })

  it('marks pricingStatus "pricing" and enqueues the worker for a valid scan', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })

    await priceItemScan.run(request({ scanId: 's1' }, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/s1')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ pricingStatus: 'pricing' }))
    expect(mockTaskQueue).toHaveBeenCalledWith('priceItemScanWorker')
    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 's1' })
  })

  it('allows an owner to price a scan too', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_SCAN })

    await priceItemScan.run(request({ scanId: 's1' }, auth('owner')))

    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 's1' })
  })
})

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

const { enqueueLotProfitabilityScore } = await import('./enqueueLotProfitabilityScore')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

const COMPLETED_IMPORT = { status: 'completed' }

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
  mockEnqueue.mockReset()
  mockTaskQueue.mockClear()
}

describe('enqueueLotProfitabilityScore', () => {
  it('rejects an unauthenticated caller', async () => {
    resetMocks()
    await expect(
      enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, undefined)),
    ).rejects.toThrow(/sign in/i)
  })

  it('rejects a caller with no tenantId claim', async () => {
    resetMocks()
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']
    await expect(
      enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, noTenantAuth)),
    ).rejects.toThrow(/tenant membership/i)
  })

  it('rejects a manager (not owner or buyer)', async () => {
    resetMocks()
    await expect(
      enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, auth('manager'))),
    ).rejects.toThrow(/owner or buyer/i)
  })

  it('rejects a missing importId', async () => {
    resetMocks()
    await expect(enqueueLotProfitabilityScore.run(request({}, auth('buyer')))).rejects.toThrow(
      /importId/i,
    )
  })

  it('rejects an import that does not exist', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => undefined })
    await expect(
      enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, auth('buyer'))),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects an import that has not finished importing', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ status: 'processing' }) })
    await expect(
      enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, auth('buyer'))),
    ).rejects.toThrow(/finish importing/i)
  })

  it('marks profitabilityStatus "scoring" and enqueues the worker for a completed import', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_IMPORT })

    await enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/imports/i1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ profitabilityStatus: 'scoring', profitabilityError: null }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('lotProfitabilityWorker')
    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', importId: 'i1' })
  })

  it('allows an owner to score a lot too', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => COMPLETED_IMPORT })

    await enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, auth('owner')))

    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', importId: 'i1' })
  })

  it('works for a manually-uploaded import too (not gated on sourceRestockLotId)', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ status: 'completed', sourceRestockLotId: null }),
    })

    await enqueueLotProfitabilityScore.run(request({ importId: 'i1' }, auth('buyer')))

    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', importId: 'i1' })
  })
})

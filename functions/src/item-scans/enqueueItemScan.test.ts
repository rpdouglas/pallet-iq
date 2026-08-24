import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockSet = vi.fn<(path: string, data: unknown) => void>()
const mockDoc = vi.fn((path: string) => ({
  set: (data: unknown) => {
    mockSet(path, data)
  },
}))

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

const { enqueueItemScan } = await import('./enqueueItemScan')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

const validData = {
  scanId: 'scan-1',
  photoPaths: [
    'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    'tenants/tenant-a/item_scans/scan-1/photo-1.jpg',
  ],
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

describe('enqueueItemScan', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(enqueueItemScan.run(request(validData, undefined))).rejects.toThrow(/sign in/i)
  })

  it('rejects a caller with no tenantId claim', async () => {
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']

    await expect(enqueueItemScan.run(request(validData, noTenantAuth))).rejects.toThrow(
      /tenant membership/i,
    )
  })

  it('rejects a manager (not owner or buyer)', async () => {
    await expect(enqueueItemScan.run(request(validData, auth('manager')))).rejects.toThrow(
      /owner or buyer/i,
    )
  })

  it('rejects a warehouse-role caller', async () => {
    await expect(enqueueItemScan.run(request(validData, auth('warehouse')))).rejects.toThrow(
      /owner or buyer/i,
    )
  })

  it('rejects a missing scanId', async () => {
    await expect(
      enqueueItemScan.run(request({ ...validData, scanId: undefined }, auth('buyer'))),
    ).rejects.toThrow(/scanId/i)
  })

  it('rejects an empty photoPaths array', async () => {
    await expect(
      enqueueItemScan.run(request({ ...validData, photoPaths: [] }, auth('buyer'))),
    ).rejects.toThrow(/photoPaths/i)
  })

  it('rejects more than 5 photoPaths', async () => {
    const tooMany = Array.from(
      { length: 6 },
      (_, i) => `tenants/tenant-a/item_scans/scan-1/photo-${i.toString()}.jpg`,
    )

    await expect(
      enqueueItemScan.run(request({ ...validData, photoPaths: tooMany }, auth('buyer'))),
    ).rejects.toThrow(/photoPaths/i)
  })

  it('rejects a photoPaths entry outside the expected scan folder', async () => {
    await expect(
      enqueueItemScan.run(
        request(
          { ...validData, photoPaths: ['tenants/tenant-a/item_scans/other-scan/x.jpg'] },
          auth('buyer'),
        ),
      ),
    ).rejects.toThrow(/does not match|do not match/i)
  })

  it('writes a queued item_scans doc and enqueues the task for a buyer', async () => {
    mockSet.mockClear()
    mockDoc.mockClear()
    mockEnqueue.mockClear()

    const result = await enqueueItemScan.run(request(validData, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/scan-1')
    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/item_scans/scan-1',
      expect.objectContaining({
        status: 'queued',
        photoPaths: validData.photoPaths,
        candidates: [],
        selectedCandidateIndex: null,
        error: null,
      }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('processItemScan')
    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', scanId: 'scan-1' })
    expect(result).toEqual({ scanId: 'scan-1' })
  })

  it('allows an owner to enqueue a scan too', async () => {
    mockSet.mockClear()

    const result = await enqueueItemScan.run(request(validData, auth('owner')))

    expect(result).toEqual({ scanId: 'scan-1' })
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockSet = vi.fn()
const mockDoc = vi.fn(() => ({ id: 'task-1', set: mockSet }))
const mockCollection = vi.fn(() => ({ doc: mockDoc }))
const mockEnqueue = vi.fn()
const mockTaskQueue = vi.fn(() => ({ enqueue: mockEnqueue }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-admin/functions', () => ({
  getFunctions: () => ({ taskQueue: mockTaskQueue }),
}))

const { enqueueDummyTask } = await import('./enqueueDummyTask')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

const buyerAuth = {
  uid: 'buyer-uid',
  token: { tenantId: 'tenant-a', role: 'buyer' },
} as CallableRequest['auth']

describe('enqueueDummyTask', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(enqueueDummyTask.run(request({}, undefined))).rejects.toThrow(/sign in/i)
  })

  it('rejects a caller with no tenantId claim', async () => {
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']

    await expect(enqueueDummyTask.run(request({}, noTenantAuth))).rejects.toThrow(
      /tenant membership/i,
    )
  })

  it("creates the task doc under the caller's own tenantId and enqueues it", async () => {
    mockCollection.mockClear()
    mockSet.mockClear()
    mockTaskQueue.mockClear()
    mockEnqueue.mockClear()

    const result = await enqueueDummyTask.run(request({}, buyerAuth))

    expect(mockCollection).toHaveBeenCalledWith('tenants/tenant-a/ai_tasks')
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dummy', status: 'queued', result: null, error: null }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('processDummyTask')
    expect(mockEnqueue).toHaveBeenCalledWith({ tenantId: 'tenant-a', taskId: 'task-1' })
    expect(result).toEqual({ taskId: 'task-1' })
  })
})

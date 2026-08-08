import { describe, expect, it, vi } from 'vitest'

const mockUpdate = vi.fn()
const mockDoc = vi.fn(() => ({ update: mockUpdate }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn() },
}))

const { processDummyTask } = await import('./processDummyTask')

function taskRequest(data: unknown) {
  return { data } as never
}

describe('processDummyTask', () => {
  it('logs and returns on an invalid payload without touching Firestore', async () => {
    mockDoc.mockClear()

    await processDummyTask.run(taskRequest({}))

    expect(mockDoc).not.toHaveBeenCalled()
  })

  it('marks the task processing then completed on success', async () => {
    mockDoc.mockClear()
    mockUpdate.mockClear()
    mockUpdate.mockResolvedValue(undefined)

    await processDummyTask.run(taskRequest({ tenantId: 'tenant-a', taskId: 'task-1' }))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/ai_tasks/task-1')
    expect(mockUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: 'processing' }))
    expect(mockUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'completed', result: { echo: true } }),
    )
  })

  it('marks the task failed and rethrows if processing fails', async () => {
    mockDoc.mockClear()
    mockUpdate.mockClear()
    mockUpdate
      .mockResolvedValueOnce(undefined) // "processing" write succeeds
      .mockRejectedValueOnce(new Error('boom')) // "completed" write fails
      .mockResolvedValueOnce(undefined) // "failed" write succeeds

    await expect(
      processDummyTask.run(taskRequest({ tenantId: 'tenant-a', taskId: 'task-1' })),
    ).rejects.toThrow('boom')

    expect(mockUpdate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ status: 'failed', error: 'boom' }),
    )
  })
})

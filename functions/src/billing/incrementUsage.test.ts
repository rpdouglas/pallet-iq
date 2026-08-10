import { describe, expect, it, vi } from 'vitest'

const mockUpdate = vi.fn()
const mockDoc = vi.fn(() => ({ update: mockUpdate }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: {
    increment: (amount: number) => ({ __increment: amount }),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

const { incrementUsage } = await import('./incrementUsage')

describe('incrementUsage', () => {
  it('atomically increments the named usage counter by 1 by default', async () => {
    mockDoc.mockClear()
    mockUpdate.mockClear()

    await incrementUsage('tenant-a', 'manifestImports')

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/subscriptions/current')
    expect(mockUpdate).toHaveBeenCalledWith({
      'usage.manifestImports': { __increment: 1 },
      updatedAt: 'SERVER_TIMESTAMP',
    })
  })

  it('increments by a custom amount', async () => {
    mockUpdate.mockClear()

    await incrementUsage('tenant-a', 'manifestImports', 3)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ 'usage.manifestImports': { __increment: 3 } }),
    )
  })
})

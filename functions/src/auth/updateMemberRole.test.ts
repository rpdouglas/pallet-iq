import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockTargetGet = vi.fn()
const mockTargetUpdate = vi.fn()
const mockSetCustomUserClaims = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: () => ({ get: mockTargetGet, update: mockTargetUpdate }),
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP', delete: () => 'FIELD_DELETE' },
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ setCustomUserClaims: mockSetCustomUserClaims }),
}))

const { updateMemberRole } = await import('./updateMemberRole')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

const ownerAuth = {
  uid: 'owner-uid',
  token: { tenantId: 'tenant-a', role: 'owner' },
} as CallableRequest['auth']

beforeEach(() => {
  mockTargetGet.mockClear()
  mockTargetUpdate.mockClear()
  mockSetCustomUserClaims.mockClear()
  mockTargetGet.mockResolvedValue({ exists: true, data: () => ({ tenantId: 'tenant-a' }) })
})

describe('updateMemberRole', () => {
  it('rejects a caller who is not an owner', async () => {
    const managerAuth = {
      uid: 'manager-uid',
      token: { tenantId: 'tenant-a', role: 'manager' },
    } as CallableRequest['auth']

    await expect(
      updateMemberRole.run(request({ uid: 'target-uid', role: 'buyer' }, managerAuth)),
    ).rejects.toThrow(/only a tenant owner/i)
  })

  it('rejects an invalid role', async () => {
    await expect(
      updateMemberRole.run(request({ uid: 'target-uid', role: 'superadmin' }, ownerAuth)),
    ).rejects.toThrow(/valid role/i)
  })

  it("rejects an owner changing their own role - self-lockout / can't touch own privilege", async () => {
    await expect(
      updateMemberRole.run(request({ uid: 'owner-uid', role: 'buyer' }, ownerAuth)),
    ).rejects.toThrow(/can't change their own role/)
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled()
  })

  it("rejects a target user outside the caller's tenant", async () => {
    mockTargetGet.mockResolvedValueOnce({ exists: true, data: () => ({ tenantId: 'tenant-b' }) })

    await expect(
      updateMemberRole.run(request({ uid: 'target-uid', role: 'buyer' }, ownerAuth)),
    ).rejects.toThrow(/not a member of your tenant/i)
  })

  it('changes a role within the tenant', async () => {
    await updateMemberRole.run(request({ uid: 'target-uid', role: 'manager' }, ownerAuth))

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('target-uid', {
      tenantId: 'tenant-a',
      role: 'manager',
    })
    expect(mockTargetUpdate).toHaveBeenCalledWith({ role: 'manager' })
  })

  it('fully clears claims on removal (role: null)', async () => {
    await updateMemberRole.run(request({ uid: 'target-uid', role: null }, ownerAuth))

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('target-uid', null)
    expect(mockTargetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'FIELD_DELETE', role: 'FIELD_DELETE' }),
    )
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockSet = vi.fn()
const mockCollection = vi.fn(() => ({ doc: () => ({ id: 'invite-1', set: mockSet }) }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}))

const { inviteMember } = await import('./inviteMember')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

const ownerAuth = {
  uid: 'owner-uid',
  token: { tenantId: 'tenant-a', role: 'owner' },
} as CallableRequest['auth']

describe('inviteMember', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(
      inviteMember.run(request({ email: 'x@example.com', role: 'buyer' }, undefined)),
    ).rejects.toThrow(/sign in/i)
  })

  it('rejects a caller who is not an owner', async () => {
    const managerAuth = {
      uid: 'manager-uid',
      token: { tenantId: 'tenant-a', role: 'manager' },
    } as CallableRequest['auth']

    await expect(
      inviteMember.run(request({ email: 'x@example.com', role: 'buyer' }, managerAuth)),
    ).rejects.toThrow(/only a tenant owner/i)
  })

  it('rejects a caller with no tenantId claim at all', async () => {
    const noTenantAuth = {
      uid: 'u1',
      token: { role: 'owner' },
    } as CallableRequest['auth']

    await expect(
      inviteMember.run(request({ email: 'x@example.com', role: 'buyer' }, noTenantAuth)),
    ).rejects.toThrow(/only a tenant owner/i)
  })

  it('rejects an invalid role', async () => {
    await expect(
      inviteMember.run(request({ email: 'x@example.com', role: 'superadmin' }, ownerAuth)),
    ).rejects.toThrow(/valid email and role/i)
  })

  it('rejects a missing email', async () => {
    await expect(inviteMember.run(request({ role: 'buyer' }, ownerAuth))).rejects.toThrow(
      /valid email and role/i,
    )
  })

  it("creates the invite under the caller's own tenantId, never a client-supplied one", async () => {
    mockCollection.mockClear()
    mockSet.mockClear()

    await inviteMember.run(
      request(
        { email: 'New.Hire@Example.com', role: 'buyer', tenantId: 'someone-elses-tenant' },
        ownerAuth,
      ),
    )

    // tenantId isn't even read from request.data - the collection path is
    // built from request.auth.token.tenantId only.
    expect(mockCollection).toHaveBeenCalledWith('tenants/tenant-a/invites')
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.hire@example.com', // normalized lowercase
        role: 'buyer',
        status: 'pending',
        invitedBy: 'owner-uid',
      }),
    )
  })
})

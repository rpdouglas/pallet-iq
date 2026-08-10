import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockSetCustomUserClaims = vi.fn()
const mockDocSet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({ doc: () => ({ id: 'generated-tenant-id' }) }),
    doc: (path: string) => ({ set: (data: unknown) => void mockDocSet(path, data) }),
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ setCustomUserClaims: mockSetCustomUserClaims }),
}))

const { createTenant } = await import('./createTenant')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

describe('createTenant', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(createTenant.run(request({ tenantName: 'Acme' }, undefined))).rejects.toThrow(
      /sign in/i,
    )
  })

  it('rejects a non-string tenantName', async () => {
    await expect(
      createTenant.run(
        request({ tenantName: 42 }, {
          uid: 'u1',
          token: { email: 'a@example.com' },
        } as CallableRequest['auth']),
      ),
    ).rejects.toThrow(/tenantName/)
  })

  it('rejects a caller that already belongs to a tenant', async () => {
    await expect(
      createTenant.run(
        request({ tenantName: 'Acme' }, {
          uid: 'u1',
          token: { email: 'a@example.com', tenantId: 'existing-tenant', role: 'buyer' },
        } as CallableRequest['auth']),
      ),
    ).rejects.toThrow(/already belongs/)
  })

  it('always assigns role owner on bootstrap, regardless of request.data', async () => {
    mockSetCustomUserClaims.mockClear()

    await createTenant.run(
      // role isn't even a field on this request type - confirms it can't be
      // smuggled in to influence the assigned role.
      request({ tenantName: 'Acme', role: 'owner-of-everything' }, {
        uid: 'u1',
        token: { email: 'a@example.com' },
      } as CallableRequest['auth']),
    )

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('u1', {
      tenantId: 'generated-tenant-id',
      role: 'owner',
    })
  })

  it('initializes subscriptions/current on Free, per ADR-0005', async () => {
    mockDocSet.mockClear()

    await createTenant.run(
      request({ tenantName: 'Acme' }, {
        uid: 'u1',
        token: { email: 'a@example.com' },
      } as CallableRequest['auth']),
    )

    expect(mockDocSet).toHaveBeenCalledWith(
      'tenants/generated-tenant-id/subscriptions/current',
      expect.objectContaining({
        plan: 'free',
        status: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        usage: {},
      }),
    )
  })
})

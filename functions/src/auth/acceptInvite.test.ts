import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockUserSet = vi.fn()
const mockInviteUpdate = vi.fn()
const mockInviteGet = vi.fn()
const mockSetCustomUserClaims = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: (path: string) => {
      if (path.startsWith('users/')) {
        return { set: mockUserSet }
      }
      return { get: mockInviteGet, update: mockInviteUpdate }
    },
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ setCustomUserClaims: mockSetCustomUserClaims }),
}))

const { acceptInvite } = await import('./acceptInvite')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function inviteSnapshot(overrides: Record<string, unknown> = {}) {
  const future = { toMillis: () => Date.now() + 60_000 }
  return {
    exists: true,
    data: () => ({
      email: 'invitee@example.com',
      role: 'buyer',
      status: 'pending',
      token: 'correct-token',
      expiresAt: future,
      ...overrides,
    }),
  }
}

const validAuth = {
  uid: 'invitee-uid',
  token: { email: 'invitee@example.com' },
} as CallableRequest['auth']

const validData = { tenantId: 'tenant-a', inviteId: 'invite-1', token: 'correct-token' }

beforeEach(() => {
  mockUserSet.mockClear()
  mockInviteUpdate.mockClear()
  mockInviteGet.mockClear()
  mockSetCustomUserClaims.mockClear()
})

describe('acceptInvite', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(acceptInvite.run(request(validData, undefined))).rejects.toThrow(/sign in/i)
  })

  it('rejects missing/non-string fields', async () => {
    await expect(
      acceptInvite.run(request({ tenantId: 'tenant-a', inviteId: 123, token: 't' }, validAuth)),
    ).rejects.toThrow(/tenantId, inviteId, and token/)
  })

  it('rejects when the invite does not exist', async () => {
    mockInviteGet.mockResolvedValueOnce({ exists: false })

    await expect(acceptInvite.run(request(validData, validAuth))).rejects.toThrow(/not found/i)
  })

  it('rejects when the invite is not pending', async () => {
    mockInviteGet.mockResolvedValueOnce(inviteSnapshot({ status: 'accepted' }))

    await expect(acceptInvite.run(request(validData, validAuth))).rejects.toThrow(
      /no longer valid/i,
    )
  })

  it('rejects a mismatched token', async () => {
    mockInviteGet.mockResolvedValueOnce(inviteSnapshot({ token: 'a-different-token' }))

    await expect(acceptInvite.run(request(validData, validAuth))).rejects.toThrow(
      /invalid invite token/i,
    )
  })

  it('rejects and expires an invite past its expiry', async () => {
    const past = { toMillis: () => Date.now() - 1000 }
    mockInviteGet.mockResolvedValueOnce(inviteSnapshot({ expiresAt: past }))

    await expect(acceptInvite.run(request(validData, validAuth))).rejects.toThrow(/expired/i)
    expect(mockInviteUpdate).toHaveBeenCalledWith({ status: 'expired' })
  })

  it("rejects when the caller's email does not match the invite's email - the invite-theft check", async () => {
    mockInviteGet.mockResolvedValueOnce(inviteSnapshot({ email: 'intended-recipient@example.com' }))
    const attackerAuth = {
      uid: 'attacker-uid',
      token: { email: 'attacker@example.com' },
    } as CallableRequest['auth']

    await expect(acceptInvite.run(request(validData, attackerAuth))).rejects.toThrow(
      /different email/i,
    )
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled()
  })

  it('sets claims from the server-side invite record, never from request.data', async () => {
    mockInviteGet.mockResolvedValueOnce(inviteSnapshot({ role: 'manager' }))

    // Even if a malicious client tried to smuggle a different role/tenantId
    // via extra request.data fields, acceptInvite's request type only reads
    // tenantId/inviteId/token - role always comes from the invite doc.
    await acceptInvite.run(request(validData, validAuth))

    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('invitee-uid', {
      tenantId: 'tenant-a',
      role: 'manager',
    })
    expect(mockInviteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted', acceptedBy: 'invitee-uid' }),
    )
  })
})

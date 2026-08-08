import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, auth } from '../firebase'
import type { Role } from '../../types/auth'

const functions = getFunctions(app)

/**
 * Forces a fresh ID token immediately after a claims-changing call resolves
 * - see ADR-0003 and AuthProvider.refreshClaims. Both do the same
 * getIdToken(true); this one lives here so a caller invoking these actions
 * directly (outside a component that has useAuth) still gets it right.
 */
async function refreshIdToken() {
  await auth.currentUser?.getIdToken(true)
}

export async function createTenant(tenantName: string): Promise<{ tenantId: string }> {
  const call = httpsCallable<{ tenantName: string }, { tenantId: string }>(
    functions,
    'createTenant',
  )
  const result = await call({ tenantName })
  await refreshIdToken()
  return result.data
}

export async function acceptInvite(params: {
  tenantId: string
  inviteId: string
  token: string
}): Promise<{ tenantId: string; role: Role }> {
  const call = httpsCallable<typeof params, { tenantId: string; role: Role }>(
    functions,
    'acceptInvite',
  )
  const result = await call(params)
  await refreshIdToken()
  return result.data
}

export async function inviteMember(params: {
  email: string
  role: Role
}): Promise<{ inviteId: string; token: string; expiresAt: number }> {
  const call = httpsCallable<typeof params, { inviteId: string; token: string; expiresAt: number }>(
    functions,
    'inviteMember',
  )
  return (await call(params)).data
}

export async function updateMemberRole(params: {
  uid: string
  role: Role | null
}): Promise<{ uid: string; role: Role | null }> {
  const call = httpsCallable<typeof params, { uid: string; role: Role | null }>(
    functions,
    'updateMemberRole',
  )
  return (await call(params)).data
}

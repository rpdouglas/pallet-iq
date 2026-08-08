import { randomUUID } from 'node:crypto'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { isRole } from './types'

interface InviteMemberRequest {
  email?: unknown
  role?: unknown
}

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// PALLETIQ-002 / ADR-0003. Owner-only - verified via the caller's own signed
// claim (request.auth.token), never trusted from client input. tenantId
// likewise always comes from the caller's claim, never request.data.
export const inviteMember = onCall<InviteMemberRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }

  const { tenantId, role: callerRole } = request.auth.token
  if (typeof tenantId !== 'string' || callerRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Only a tenant owner can invite members.')
  }

  const email =
    typeof request.data.email === 'string' ? request.data.email.trim().toLowerCase() : ''
  const role = request.data.role
  if (!email || !isRole(role)) {
    throw new HttpsError('invalid-argument', 'A valid email and role are required.')
  }

  const db = getFirestore()
  const inviteRef = db.collection(`tenants/${tenantId}/invites`).doc()
  const token = randomUUID()
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_EXPIRY_MS)

  await inviteRef.set({
    email,
    role,
    status: 'pending',
    invitedBy: request.auth.uid,
    token,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  })

  // token is returned to the caller (the inviting owner) to hand to the
  // invitee out-of-band (email, Slack, etc.) - it is never itself readable
  // from Firestore, since the invites collection is Cloud-Functions-only.
  return { inviteId: inviteRef.id, token, expiresAt: expiresAt.toMillis() }
})

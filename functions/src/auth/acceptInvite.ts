import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { InviteDoc } from './types'

interface AcceptInviteRequest {
  tenantId?: unknown
  inviteId?: unknown
  token?: unknown
}

// PALLETIQ-002 / ADR-0003. Claims are set from the server-side invite
// record (invite.tenantId via the doc path, invite.role) - never from
// client-supplied values. The caller's Firebase-verified email must match
// the invite's target email, so a different authenticated user can't
// redeem someone else's invite even if they somehow obtained the token.
export const acceptInvite = onCall<AcceptInviteRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before accepting an invite.')
  }

  const { tenantId, inviteId, token } = request.data
  if (
    typeof tenantId !== 'string' ||
    typeof inviteId !== 'string' ||
    typeof token !== 'string' ||
    !tenantId ||
    !inviteId ||
    !token
  ) {
    throw new HttpsError('invalid-argument', 'tenantId, inviteId, and token are required.')
  }

  const db = getFirestore()
  const inviteRef = db.doc(`tenants/${tenantId}/invites/${inviteId}`)
  const inviteSnap = await inviteRef.get()

  if (!inviteSnap.exists) {
    throw new HttpsError('not-found', 'Invite not found.')
  }

  const invite = inviteSnap.data() as InviteDoc

  if (invite.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This invite is no longer valid.')
  }

  if (invite.token !== token) {
    throw new HttpsError('permission-denied', 'Invalid invite token.')
  }

  if (invite.expiresAt.toMillis() < Date.now()) {
    await inviteRef.update({ status: 'expired' })
    throw new HttpsError('failed-precondition', 'This invite has expired.')
  }

  const callerEmail = request.auth.token.email?.toLowerCase()
  if (!callerEmail || callerEmail !== invite.email.toLowerCase()) {
    throw new HttpsError('permission-denied', 'This invite was sent to a different email address.')
  }

  const uid = request.auth.uid

  await db.doc(`users/${uid}`).set({
    tenantId,
    role: invite.role,
    email: callerEmail,
    createdAt: FieldValue.serverTimestamp(),
  })

  await getAuth().setCustomUserClaims(uid, { tenantId, role: invite.role })

  await inviteRef.update({
    status: 'accepted',
    acceptedAt: FieldValue.serverTimestamp(),
    acceptedBy: uid,
  })

  return { tenantId, role: invite.role }
})

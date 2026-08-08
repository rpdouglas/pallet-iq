import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { isRole } from './types'

interface UpdateMemberRoleRequest {
  uid?: unknown
  role?: unknown // a Role, or null to revoke tenant access (removal)
}

// PALLETIQ-002 / ADR-0003. Owner-only, same caller-claim check as
// inviteMember - never trusts request.data for the caller's own tenantId
// or role. Covers role changes and removal in one code path, per
// docs/personas/owner-admin.md ("only role permitted to remove or demote
// other tenant members").
//
// An owner can never touch their own role through this function (see check
// below), which structurally prevents a tenant from ending up with zero
// owners via this path.
export const updateMemberRole = onCall<UpdateMemberRoleRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }

  const { tenantId, role: callerRole } = request.auth.token
  if (typeof tenantId !== 'string' || callerRole !== 'owner') {
    throw new HttpsError('permission-denied', 'Only a tenant owner can change member roles.')
  }

  const uid = typeof request.data.uid === 'string' ? request.data.uid : ''
  const role = request.data.role
  if (!uid || (role !== null && !isRole(role))) {
    throw new HttpsError(
      'invalid-argument',
      'A target uid and a valid role (or null) are required.',
    )
  }

  if (uid === request.auth.uid) {
    throw new HttpsError(
      'failed-precondition',
      "An owner can't change their own role through this function.",
    )
  }

  const db = getFirestore()
  const targetRef = db.doc(`users/${uid}`)
  const targetSnap = await targetRef.get()
  if (!targetSnap.exists || targetSnap.data()?.tenantId !== tenantId) {
    throw new HttpsError('not-found', 'That user is not a member of your tenant.')
  }

  if (role === null) {
    await getAuth().setCustomUserClaims(uid, null)
    await targetRef.update({
      tenantId: FieldValue.delete(),
      role: FieldValue.delete(),
      removedAt: FieldValue.serverTimestamp(),
    })
    return { uid, role: null }
  }

  await getAuth().setCustomUserClaims(uid, { tenantId, role })
  await targetRef.update({ role })

  return { uid, role }
})

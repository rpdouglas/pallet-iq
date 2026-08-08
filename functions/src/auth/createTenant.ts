import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

interface CreateTenantRequest {
  tenantName?: unknown
}

// PALLETIQ-002 / ADR-0003. Tenant bootstrap: the first user of a brand-new
// tenant becomes owner unconditionally - role is never client-specifiable,
// there's no invite to check because there's no tenant yet.
export const createTenant = onCall<CreateTenantRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before creating a tenant.')
  }

  const tenantName =
    typeof request.data.tenantName === 'string' ? request.data.tenantName.trim() : ''
  if (!tenantName) {
    throw new HttpsError('invalid-argument', 'tenantName is required.')
  }

  const email = request.auth.token.email
  if (!email) {
    throw new HttpsError('failed-precondition', 'Account has no verified email.')
  }

  if (request.auth.token.tenantId) {
    throw new HttpsError('failed-precondition', 'This account already belongs to a tenant.')
  }

  const uid = request.auth.uid
  const db = getFirestore()
  const tenantId = db.collection('tenants').doc().id

  await db.doc(`tenants/${tenantId}/settings/general`).set({
    name: tenantName,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: uid,
  })

  await db.doc(`users/${uid}`).set({
    tenantId,
    role: 'owner',
    email,
    createdAt: FieldValue.serverTimestamp(),
  })

  await getAuth().setCustomUserClaims(uid, { tenantId, role: 'owner' })

  return { tenantId }
})

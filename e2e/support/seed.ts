import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { adminApp } from './adminApp'

// Mirrors functions/src/auth/createTenant.ts's doc shapes exactly, via the
// Admin SDK direct-to-emulator rather than the onCall itself - see
// ADR-0017 for why (keeps "system under test" separate from "test fixture
// setup" for every spec except e2e/auth-onboarding.spec.ts, which tests
// the real callable directly). NOTE: these two are not shared code - if
// createTenant.ts's doc shape changes, this must be updated to match by
// hand, or specs relying on it will seed stale-shaped data.

type Role = 'owner' | 'manager' | 'warehouse' | 'buyer'

const db = () => getFirestore(adminApp)
const auth = () => getAuth(adminApp)

export async function createTestTenant(tenantName: string): Promise<{ tenantId: string }> {
  const tenantId = db().collection('tenants').doc().id

  await db().doc(`tenants/${tenantId}/settings/general`).set({
    name: tenantName,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'e2e-seed',
  })

  await db().doc(`tenants/${tenantId}/subscriptions/current`).set({
    plan: 'free',
    status: 'free',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    usage: {},
    updatedAt: FieldValue.serverTimestamp(),
  })

  return { tenantId }
}

/**
 * Creates an Auth user, and - only if `tenantId`/`role` are given - sets
 * custom claims and writes the `users/{uid}` mirror doc. Passing neither
 * leaves the user in the real "signed up, no tenant yet" state that
 * `RequireNoTenant` guards on.
 */
export async function createTestUser(params: {
  email: string
  password: string
  tenantId?: string
  role?: Role
}): Promise<{ uid: string }> {
  const { email, password, tenantId, role } = params
  const user = await auth().createUser({ email, password, emailVerified: true })

  if (tenantId && role) {
    await auth().setCustomUserClaims(user.uid, { tenantId, role })
    await db().doc(`users/${user.uid}`).set({
      tenantId,
      role,
      email,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  return { uid: user.uid }
}

export async function createTestTenantWithOwner(params: {
  tenantName: string
  email: string
  password: string
}): Promise<{ tenantId: string; uid: string }> {
  const { tenantId } = await createTestTenant(params.tenantName)
  const { uid } = await createTestUser({
    email: params.email,
    password: params.password,
    tenantId,
    role: 'owner',
  })
  return { tenantId, uid }
}

/** Mirrors functions/src/restock-scraper/types.ts's RestockLotDoc shape. */
export async function seedRestockLot(overrides: {
  id: string
  title?: string
  category?: string
  units?: number
  condition?: string
  msrp?: number | null
  price?: number | null
}): Promise<{ id: string }> {
  const now = Timestamp.now()
  await db()
    .doc(`restock_lots/${overrides.id}`)
    .set({
      lotNumber: overrides.id,
      title: overrides.title ?? 'E2E fixture lot',
      category: overrides.category ?? 'Tools',
      units: overrides.units ?? 10,
      condition: overrides.condition ?? 'Returns',
      msrp: overrides.msrp ?? 100,
      price: overrides.price ?? 60,
      costPerUnit: null,
      vendor: null,
      warehouse: null,
      productUrl: `https://restock.ca/lot/${overrides.id}`,
      imageUrl: null,
      manifestUrl: null,
      status: 'active',
      firstSeenAt: now,
      lastSeenAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    })
  return { id: overrides.id }
}

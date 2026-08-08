import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'

// Firestore security rules scaffold — Phase 0.
//
// Requires the Firestore emulator: `firebase emulators:exec --only firestore
// "vitest run firestore.rules.test.ts"`. Every collection in firestore.rules
// needs a corresponding block here per docs/GOVERNANCE.md Check I. This file
// seeds the pattern with the cross-tenant read/write denial cases; expand
// per-collection as each area's real RBAC policy is implemented.

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'palletiq-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

describe('tenant isolation', () => {
  it("denies reading another tenant's vendors", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(memberOfA.firestore().doc(`tenants/${TENANT_B}/vendors/vendor-1`).get())
  })

  it("denies writing to another tenant's inventory", async () => {
    const memberOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertFails(
      memberOfA
        .firestore()
        .doc(`tenants/${TENANT_B}/inventory/item-1`)
        .set({ sku: 'unauthorized-write' }),
    )
  })

  it('denies unauthenticated access to a tenant collection', async () => {
    const anon = testEnv.unauthenticatedContext()

    await assertFails(anon.firestore().doc(`tenants/${TENANT_A}/pallets/pallet-1`).get())
  })

  it("allows a tenant member to read their own tenant's vendors", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(memberOfA.firestore().doc(`tenants/${TENANT_A}/vendors/vendor-1`).get())
  })
})

describe('invites (Cloud Functions only)', () => {
  it('denies a client read even from the inviting owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc(`tenants/${TENANT_A}/invites/invite-1`)
        .set({ email: 'new-hire@example.com', role: 'buyer', status: 'pending' })
    })

    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(ownerOfA.firestore().doc(`tenants/${TENANT_A}/invites/invite-1`).get())
  })

  it('denies a client write even from an owner', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(
      ownerOfA
        .firestore()
        .doc(`tenants/${TENANT_A}/invites/invite-2`)
        .set({ email: 'attacker@example.com', role: 'owner', status: 'pending' }),
    )
  })
})

describe('users/{userId}', () => {
  it('denies a client creating its own user doc directly', async () => {
    const buyerA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      buyerA
        .firestore()
        .doc('users/buyer-a')
        .set({ tenantId: TENANT_A, role: 'buyer', displayName: 'Buyer A' }),
    )
  })

  it('denies a client escalating its own role via update, even on its own doc', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc('users/buyer-a')
        .set({ tenantId: TENANT_A, role: 'buyer', displayName: 'Buyer A' })
    })

    const buyerA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(buyerA.firestore().doc('users/buyer-a').update({ role: 'owner' }))
  })

  it("denies an owner changing a member's tenantId via update (must go through updateMemberRole)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc('users/buyer-a')
        .set({ tenantId: TENANT_A, role: 'buyer', displayName: 'Buyer A' })
    })

    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(ownerOfA.firestore().doc('users/buyer-a').update({ tenantId: TENANT_B }))
  })

  it('allows a user to update a non-restricted field on its own doc', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc('users/buyer-a')
        .set({ tenantId: TENANT_A, role: 'buyer', displayName: 'Buyer A' })
    })

    const buyerA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(
      buyerA.firestore().doc('users/buyer-a').update({ displayName: 'Updated Name' }),
    )
  })

  it("denies an owner reading a different tenant's member profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc('users/buyer-b')
        .set({ tenantId: TENANT_B, role: 'buyer', displayName: 'Buyer B' })
    })

    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(ownerOfA.firestore().doc('users/buyer-b').get())
  })
})

describe('product_intelligence (cross-tenant)', () => {
  it('allows any authenticated tenant member to read', async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(memberOfA.firestore().doc('product_intelligence/upc-000000000000').get())
  })

  it('denies client writes even from an owner', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(
      ownerOfA.firestore().doc('product_intelligence/upc-000000000000').set({ avgResalePrice: 1 }),
    )
  })
})

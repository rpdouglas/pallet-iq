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

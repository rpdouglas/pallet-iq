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

// The remaining collections below share one of a small number of RBAC
// shapes. Rather than hand-writing a near-identical block per collection,
// describe.each parameterizes the shared shapes so every collection still
// gets its own named pair of tests (governance Check I) without the
// duplication drifting out of sync as collections are added.

describe.each([
  'vendors',
  'imports',
  'imports_errors',
  'manifests',
  'pallets',
  'inventory',
  'sales',
  'locations',
  'bids',
  'claims',
])('%s (tenant member read, owner/manager write)', (collection) => {
  it('allows a tenant member to read a doc in their own tenant', async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(memberOfA.firestore().doc(`tenants/${TENANT_A}/${collection}/doc-1`).get())
  })

  it("denies reading another tenant's doc", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(memberOfA.firestore().doc(`tenants/${TENANT_B}/${collection}/doc-1`).get())
  })

  it('allows a manager to write a doc in their own tenant', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertSucceeds(
      managerOfA.firestore().doc(`tenants/${TENANT_A}/${collection}/doc-1`).set({ seeded: true }),
    )
  })

  it('denies a buyer writing a doc in their own tenant', async () => {
    const buyerOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      buyerOfA.firestore().doc(`tenants/${TENANT_A}/${collection}/doc-1`).set({ seeded: true }),
    )
  })
})

describe('lineItems (nested under manifests, tenant member read, owner/manager write)', () => {
  it('allows a tenant member to read a line item in their own tenant', async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(
      memberOfA.firestore().doc(`tenants/${TENANT_A}/manifests/manifest-1/lineItems/item-1`).get(),
    )
  })

  it("denies reading another tenant's line item", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      memberOfA.firestore().doc(`tenants/${TENANT_B}/manifests/manifest-1/lineItems/item-1`).get(),
    )
  })

  it('allows a manager to write a line item in their own tenant', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertSucceeds(
      managerOfA
        .firestore()
        .doc(`tenants/${TENANT_A}/manifests/manifest-1/lineItems/item-1`)
        .set({ sku: 'abc' }),
    )
  })

  it('denies a buyer writing a line item in their own tenant', async () => {
    const buyerOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      buyerOfA
        .firestore()
        .doc(`tenants/${TENANT_A}/manifests/manifest-1/lineItems/item-1`)
        .set({ sku: 'abc' }),
    )
  })
})

describe.each(['favorites', 'watchlists', 'notes', 'tasks'])(
  '%s (any tenant member read/write)',
  (collection) => {
    it('allows a tenant member to read and write a doc in their own tenant', async () => {
      const memberOfA = testEnv.authenticatedContext('buyer-a', {
        tenantId: TENANT_A,
        role: 'buyer',
      })

      await assertSucceeds(
        memberOfA.firestore().doc(`tenants/${TENANT_A}/${collection}/doc-1`).set({ seeded: true }),
      )
    })

    it("denies reading another tenant's doc", async () => {
      const memberOfA = testEnv.authenticatedContext('buyer-a', {
        tenantId: TENANT_A,
        role: 'buyer',
      })

      await assertFails(memberOfA.firestore().doc(`tenants/${TENANT_B}/${collection}/doc-1`).get())
    })
  },
)

describe('analytics_rollups (system-populated, member read-only)', () => {
  it('allows a tenant member to read a rollup in their own tenant', async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(
      memberOfA.firestore().doc(`tenants/${TENANT_A}/analytics_rollups/rollup-1`).get(),
    )
  })

  it("denies reading another tenant's rollup", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      memberOfA.firestore().doc(`tenants/${TENANT_B}/analytics_rollups/rollup-1`).get(),
    )
  })

  it('denies a client write even from an owner (Cloud Functions only)', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/analytics_rollups/rollup-1`).set({ total: 1 }),
    )
  })
})

describe('settings (member read, owner-only write)', () => {
  it('allows a tenant member to read settings in their own tenant', async () => {
    const buyerA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(buyerA.firestore().doc(`tenants/${TENANT_A}/settings/general`).get())
  })

  it("denies reading another tenant's settings", async () => {
    const buyerA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(buyerA.firestore().doc(`tenants/${TENANT_B}/settings/general`).get())
  })

  it('denies a manager writing settings (owner-only)', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertFails(
      managerOfA.firestore().doc(`tenants/${TENANT_A}/settings/general`).set({ timezone: 'UTC' }),
    )
  })

  it('allows an owner to write settings in their own tenant', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertSucceeds(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/settings/general`).set({ timezone: 'UTC' }),
    )
  })
})

describe('api_keys (owner-only read/write)', () => {
  it('allows an owner to read and write api keys in their own tenant', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertSucceeds(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/api_keys/key-1`).set({ label: 'test' }),
    )
  })

  it('denies a manager reading api keys (owner-only)', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertFails(managerOfA.firestore().doc(`tenants/${TENANT_A}/api_keys/key-1`).get())
  })

  it("denies an owner reading another tenant's api keys", async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(ownerOfA.firestore().doc(`tenants/${TENANT_B}/api_keys/key-1`).get())
  })
})

describe('audit_logs (owner/manager read-only, Cloud Functions write)', () => {
  it('allows a manager to read audit logs in their own tenant', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertSucceeds(managerOfA.firestore().doc(`tenants/${TENANT_A}/audit_logs/log-1`).get())
  })

  it('denies a buyer reading audit logs (owner/manager only)', async () => {
    const buyerA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(buyerA.firestore().doc(`tenants/${TENANT_A}/audit_logs/log-1`).get())
  })

  it('denies a client write even from an owner (Cloud Functions only)', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/audit_logs/log-1`).set({ action: 'test' }),
    )
  })
})

describe('subscriptions (owner-only read, Cloud Functions write)', () => {
  it('allows an owner to read subscription info in their own tenant', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertSucceeds(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/subscriptions/current`).get(),
    )
  })

  it('denies a manager reading subscription info (owner-only)', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertFails(managerOfA.firestore().doc(`tenants/${TENANT_A}/subscriptions/current`).get())
  })

  it('denies a client write even from an owner (Stripe webhook via Cloud Functions only)', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/subscriptions/current`).set({ plan: 'pro' }),
    )
  })
})

describe('ai_tasks (system-populated, member read-only)', () => {
  it('allows a tenant member to read a task in their own tenant', async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(memberOfA.firestore().doc(`tenants/${TENANT_A}/ai_tasks/task-1`).get())
  })

  it("denies reading another tenant's task", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(memberOfA.firestore().doc(`tenants/${TENANT_B}/ai_tasks/task-1`).get())
  })

  it('denies a client write even from an owner (Cloud Functions only)', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', {
      tenantId: TENANT_A,
      role: 'owner',
    })

    await assertFails(
      ownerOfA.firestore().doc(`tenants/${TENANT_A}/ai_tasks/task-1`).set({ status: 'queued' }),
    )
  })
})

// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { getBytes, ref, uploadBytes } from 'firebase/storage'

// Cloud Storage security rules — Phase 0 scaffold.
//
// Requires the Storage emulator: `firebase emulators:exec --only storage
// "vitest run storage.rules.test.ts"`. Mirrors firestore.rules.test.ts's
// tenant-isolation coverage for storage.rules per docs/GOVERNANCE.md Check I.

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'palletiq-rules-test',
    storage: {
      rules: readFileSync('storage.rules', 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

// Uses a hypothetical non-manifests path (e.g. a future "images" upload
// type) to exercise the general blanket rule in isolation from
// manifests/'s tighter, role-specific policy below.
describe('tenant isolation (general blanket rule)', () => {
  it("allows a tenant member to write within their own tenant's folder", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(
      uploadBytes(
        ref(memberOfA.storage(), `tenants/${TENANT_A}/misc/file.csv`),
        new Uint8Array([1, 2, 3]),
      ),
    )
  })

  it("denies a tenant member writing to another tenant's folder", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      uploadBytes(
        ref(memberOfA.storage(), `tenants/${TENANT_B}/misc/file.csv`),
        new Uint8Array([1, 2, 3]),
      ),
    )
  })

  it("denies a tenant member reading another tenant's folder", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(
        ref(context.storage(), `tenants/${TENANT_B}/misc/file.csv`),
        new Uint8Array([1, 2, 3]),
      )
    })

    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(getBytes(ref(memberOfA.storage(), `tenants/${TENANT_B}/misc/file.csv`)))
  })

  it('denies unauthenticated access to a tenant folder', async () => {
    const anon = testEnv.unauthenticatedContext()

    await assertFails(getBytes(ref(anon.storage(), `tenants/${TENANT_A}/misc/file.csv`)))
  })

  it('denies access to a path outside the tenants/ prefix (deny-by-default)', async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(
      uploadBytes(ref(memberOfA.storage(), 'unscoped/file.csv'), new Uint8Array([1, 2, 3])),
    )
  })
})

// PALLETIQ-008 / ADR-0006. The raw file has unitCost as a plain column, so
// read is Owner/Manager/Buyer (excluding Warehouse) and write is
// Owner/Buyer - tighter than, and NOT covered by, the general blanket rule
// above (see storage.rules' comment on why that exclusion is required).
describe('manifests/{importId}/{fileName} (role-restricted, not the general blanket rule)', () => {
  const PATH = `tenants/${TENANT_A}/manifests/import-1/original.csv`

  it('allows an owner to upload a manifest file', async () => {
    const ownerOfA = testEnv.authenticatedContext('owner-a', { tenantId: TENANT_A, role: 'owner' })

    await assertSucceeds(uploadBytes(ref(ownerOfA.storage(), PATH), new Uint8Array([1, 2, 3])))
  })

  it('allows a buyer to upload a manifest file', async () => {
    const buyerOfA = testEnv.authenticatedContext('buyer-a', { tenantId: TENANT_A, role: 'buyer' })

    await assertSucceeds(uploadBytes(ref(buyerOfA.storage(), PATH), new Uint8Array([1, 2, 3])))
  })

  it('denies a manager uploading a manifest file (read-only)', async () => {
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertFails(uploadBytes(ref(managerOfA.storage(), PATH), new Uint8Array([1, 2, 3])))
  })

  it('denies a warehouse-role user uploading a manifest file', async () => {
    const warehouseOfA = testEnv.authenticatedContext('warehouse-a', {
      tenantId: TENANT_A,
      role: 'warehouse',
    })

    await assertFails(uploadBytes(ref(warehouseOfA.storage(), PATH), new Uint8Array([1, 2, 3])))
  })

  it('allows a manager to read a manifest file (cost is a UI-level omission, not a rules one)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), PATH), new Uint8Array([1, 2, 3]))
    })
    const managerOfA = testEnv.authenticatedContext('manager-a', {
      tenantId: TENANT_A,
      role: 'manager',
    })

    await assertSucceeds(getBytes(ref(managerOfA.storage(), PATH)))
  })

  it('denies a warehouse-role user reading a manifest file (would bypass the unitCost omission)', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(ref(context.storage(), PATH), new Uint8Array([1, 2, 3]))
    })
    const warehouseOfA = testEnv.authenticatedContext('warehouse-a', {
      tenantId: TENANT_A,
      role: 'warehouse',
    })

    await assertFails(getBytes(ref(warehouseOfA.storage(), PATH)))
  })

  it("denies a tenant member reading another tenant's manifest file", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(
        ref(context.storage(), `tenants/${TENANT_B}/manifests/import-1/original.csv`),
        new Uint8Array([1, 2, 3]),
      )
    })
    const buyerOfA = testEnv.authenticatedContext('buyer-a', { tenantId: TENANT_A, role: 'buyer' })

    await assertFails(
      getBytes(ref(buyerOfA.storage(), `tenants/${TENANT_B}/manifests/import-1/original.csv`)),
    )
  })
})

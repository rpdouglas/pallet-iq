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

describe('tenant isolation', () => {
  it("allows a tenant member to write within their own tenant's folder", async () => {
    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertSucceeds(
      uploadBytes(
        ref(memberOfA.storage(), `tenants/${TENANT_A}/manifests/file.csv`),
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
        ref(memberOfA.storage(), `tenants/${TENANT_B}/manifests/file.csv`),
        new Uint8Array([1, 2, 3]),
      ),
    )
  })

  it("denies a tenant member reading another tenant's folder", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(
        ref(context.storage(), `tenants/${TENANT_B}/manifests/file.csv`),
        new Uint8Array([1, 2, 3]),
      )
    })

    const memberOfA = testEnv.authenticatedContext('buyer-a', {
      tenantId: TENANT_A,
      role: 'buyer',
    })

    await assertFails(getBytes(ref(memberOfA.storage(), `tenants/${TENANT_B}/manifests/file.csv`)))
  })

  it('denies unauthenticated access to a tenant folder', async () => {
    const anon = testEnv.unauthenticatedContext()

    await assertFails(getBytes(ref(anon.storage(), `tenants/${TENANT_A}/manifests/file.csv`)))
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

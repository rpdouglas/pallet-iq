import type { Page } from '@playwright/test'
import { createTestTenant, createTestTenantWithOwner, createTestUser } from './seed'

type Role = 'owner' | 'manager' | 'warehouse' | 'buyer'

const TEST_PASSWORD = 'E2eTestPass123'

function uniqueEmail(label: string): string {
  return `e2e-${label}-${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

/** Seeds a fresh tenant + owner, then signs in via the real SignInPage. */
export async function signInAsOwner(
  page: Page,
  tenantName = 'E2E Test Tenant',
): Promise<{ tenantId: string; uid: string; email: string }> {
  const email = uniqueEmail('owner')
  const { tenantId, uid } = await createTestTenantWithOwner({
    tenantName,
    email,
    password: TEST_PASSWORD,
  })
  await signInAs(page, email)
  return { tenantId, uid, email }
}

/** Seeds a fresh tenant + a user with the given non-owner role, signs in. */
export async function signInAsRole(
  page: Page,
  role: Role,
  tenantName = 'E2E Test Tenant',
): Promise<{ tenantId: string; uid: string; email: string }> {
  const { tenantId } = await createTestTenant(tenantName)
  const email = uniqueEmail(role)
  const { uid } = await createTestUser({ email, password: TEST_PASSWORD, tenantId, role })
  await signInAs(page, email)
  return { tenantId, uid, email }
}

/** Seeds a signed-up user with no tenant at all, signs in. */
export async function signInWithNoTenant(page: Page): Promise<{ uid: string; email: string }> {
  const email = uniqueEmail('no-tenant')
  const { uid } = await createTestUser({ email, password: TEST_PASSWORD })
  await signInAs(page, email)
  return { uid, email }
}

async function signInAs(page: Page, email: string): Promise<void> {
  await page.goto('/signin')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export { TEST_PASSWORD }

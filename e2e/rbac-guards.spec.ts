import { expect, test } from '@playwright/test'
import { signInAsRole, signInWithNoTenant } from './support/fixtures'

// PALLETIQ-051/ADR-0017. Exercises src/lib/auth/RequireRole.tsx and
// RequireNoTenant.tsx end-to-end - a real claims round-trip and real
// redirect navigation, which unit tests can only approximate with a mocked
// AuthContext value.
test('a buyer can reach a general route but is redirected away from a manager-only one', async ({
  page,
}) => {
  await signInAsRole(page, 'buyer')
  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.goto('/discovered-lots')
  await expect(page.getByRole('heading', { name: 'Discovered lots' })).toBeVisible()

  // /scanned-items is owner/manager-only (App.tsx) - RequireRole's default
  // redirectTo is '/', not /signin, since this user IS authenticated, just
  // not permitted for this specific route.
  await page.goto('/scanned-items')
  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('a signed-in user with no tenant is redirected to onboarding', async ({ page }) => {
  await signInWithNoTenant(page)
  await page.waitForURL('/onboarding')
  await expect(page.getByText('Name your workspace to get started.')).toBeVisible()
})

import { expect, test } from '@playwright/test'

// PALLETIQ-051/ADR-0017. Deliberately does NOT use e2e/support/seed.ts for
// its primary flow - this is the one spec that exercises the real
// sign-up -> onboarding -> createTenant path directly (everything else
// seeds around it). Needs the functions emulator actually serving the
// createTenant callable, unlike the other two specs.
test('a new user can sign up, create a workspace, and land on the dashboard', async ({ page }) => {
  const email = `e2e-signup-${Date.now().toString()}@example.com`
  const password = 'E2eTestPass123'

  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await page.waitForURL('/onboarding')
  await page.getByLabel('Workspace name').fill('Acme Liquidation')
  await page.getByRole('button', { name: 'Create workspace' }).click()

  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

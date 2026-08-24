import { getFirestore } from 'firebase-admin/firestore'
import { expect, test } from '@playwright/test'
import { adminApp } from './support/adminApp'
import { signInAsOwner } from './support/fixtures'
import { seedRestockLot } from './support/seed'

// PALLETIQ-051/ADR-0017. Direct-Firestore-write CRUD path: seeds
// non-auth fixture data (a global restock_lots doc, per ADR-0009) and
// exercises a real client-side mutation round-trip, not just navigation.
test('a buyer can dismiss a discovered lot and it disappears from the list', async ({ page }) => {
  await seedRestockLot({ id: 'e2e-lot-1', title: 'E2E Cordless Drill Kit' })

  const { tenantId } = await signInAsOwner(page)
  await page.waitForURL('/')

  await page.goto('/discovered-lots')
  // Both the table (desktop) and card (mobile) layouts render in the DOM at
  // once - PALLETIQ-050's responsive split toggles visibility via CSS, not
  // conditional rendering - so scope to the table, which is what renders at
  // Playwright's default desktop viewport, to avoid an ambiguous match.
  const table = page.getByTestId('lots-table')
  await expect(table.getByText('E2E Cordless Drill Kit')).toBeVisible()

  page.once('dialog', (dialog) => {
    void dialog.accept()
  })
  await table.getByLabel('Remove E2E Cordless Drill Kit').click()

  await expect(table.getByText('E2E Cordless Drill Kit')).not.toBeVisible()

  const dismissedDoc = await getFirestore(adminApp)
    .doc(`tenants/${tenantId}/dismissed_lots/e2e-lot-1`)
    .get()
  expect(dismissedDoc.exists).toBe(true)
})

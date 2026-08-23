import { initializeApp } from 'firebase-admin/app'

initializeApp()

// PALLETIQ-002 / ADR-0003.
export { createTenant } from './auth/createTenant'
export { inviteMember } from './auth/inviteMember'
export { acceptInvite } from './auth/acceptInvite'
export { updateMemberRole } from './auth/updateMemberRole'

// PALLETIQ-005 / ADR-0004.
export { enqueueDummyTask } from './ai-tasks/enqueueDummyTask'
export { processDummyTask } from './ai-tasks/processDummyTask'

// PALLETIQ-003 / ADR-0005.
export { createCheckoutSession } from './billing/createCheckoutSession'
export { stripeWebhook } from './billing/stripeWebhook'

// PALLETIQ-008 / ADR-0006.
export { enqueueManifestImport } from './manifests/enqueueManifestImport'
export { processManifestImport } from './manifests/processManifestImport'

// PALLETIQ-020 / ADR-0009. restock.ca's Terms of Use/robots.txt were
// checked and confirmed to permit this before scrapeRestockLots was
// written - see ADR-0009's Context section. restock.ca only: B-Stock and
// Direct Liquidation are never scraped anywhere in this codebase, both
// explicitly prohibit it - see PALLETIQ-021's manual watchlist instead.
export { scrapeRestockLots } from './restock-scraper/scrapeRestockLots'

// PALLETIQ-025 / ADR-0011.
export { enqueueItemScan } from './item-scans/enqueueItemScan'
export { processItemScan } from './item-scans/processItemScan'

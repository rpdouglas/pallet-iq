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

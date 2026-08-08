import { initializeApp } from 'firebase-admin/app'

initializeApp()

// PALLETIQ-002 / ADR-0003.
export { createTenant } from './auth/createTenant'
export { inviteMember } from './auth/inviteMember'
export { acceptInvite } from './auth/acceptInvite'
export { updateMemberRole } from './auth/updateMemberRole'

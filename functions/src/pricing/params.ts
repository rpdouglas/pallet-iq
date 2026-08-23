import { defineSecret } from 'firebase-functions/params'

// PALLETIQ-026 / ADR-0011. eBay Browse API OAuth client-credentials grant.
// EBAY_APP_ID/EBAY_CERT_ID are eBay's own names for these values (the
// "Application Keys" page in the eBay Developer Program console) - not
// PalletIQ-invented names. Live verification of this step is deferred
// (mirrors PALLETIQ-003's Stripe precedent) until the owner provisions a
// real eBay Developer account; provisioned just-in-time per ADR-0005's
// convention once ready.
export const ebayAppId = defineSecret('EBAY_APP_ID')
export const ebayCertId = defineSecret('EBAY_CERT_ID')

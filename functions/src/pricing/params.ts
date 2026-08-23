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

// PALLETIQ-027 / ADR-0011. Category-specialist pricing sources. Live
// verification deferred the same way as EBAY_APP_ID/EBAY_CERT_ID above -
// the owner provisions real accounts and secret values when ready.
// Discogs and Google Books need no secret (free/anonymous tiers), per
// ADR-0011's "Discogs and Google Books' free/anonymous tiers need no
// secret for v1" note.
export const keepaApiKey = defineSecret('KEEPA_API_KEY')
export const priceChartingApiKey = defineSecret('PRICECHARTING_API_KEY')

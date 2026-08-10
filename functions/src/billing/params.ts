import { defineSecret, defineString } from 'firebase-functions/params'

// PALLETIQ-003 / ADR-0005. Secrets are backed by Secret Manager, injected at
// invocation time - never in source or Functions config. Provisioned
// manually in mrt-pallet-iq (see ADR-0005's Consequences). The price ID
// isn't sensitive, so it's a plain string param, not a secret.
export const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY')
export const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET')
export const stripeProPriceId = defineString('STRIPE_PRO_PRICE_ID')

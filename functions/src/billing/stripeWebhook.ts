import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { onRequest, type Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import Stripe from 'stripe'
import { stripeSecretKey, stripeWebhookSecret } from './params'

// PALLETIQ-003 / ADR-0005. Public by necessity - Stripe calls this
// directly, not a signed-in tenant member. The Stripe signature check on
// the raw body is the entire security boundary, unlike every other
// function in this codebase so far (all onCall, gated by request.auth).
// This is the only source of truth for subscription state - never trust a
// client-side redirect after Checkout.
export const stripeWebhook = onRequest(
  // invoker: 'public' - Stripe calls this with no GCP-recognized identity;
  // the Stripe-Signature check below is the real security boundary.
  { secrets: [stripeSecretKey, stripeWebhookSecret], invoker: 'public' },
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature']
    if (typeof signature !== 'string') {
      res.status(400).send('Missing Stripe-Signature header.')
      return
    }

    const stripe = new Stripe(stripeSecretKey.value())
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value())
    } catch (err) {
      logger.error('stripeWebhook: signature verification failed', err)
      res.status(400).send('Invalid signature.')
      return
    }

    const db = getFirestore()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const tenantId = session.client_reference_id
        if (!tenantId) {
          logger.error('stripeWebhook: checkout.session.completed missing client_reference_id')
          break
        }
        await db.doc(`tenants/${tenantId}/subscriptions/current`).set(
          {
            plan: 'pro',
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const tenantId = subscription.metadata.tenantId
        if (!tenantId) {
          logger.error('stripeWebhook: subscription missing tenantId metadata', subscription.id)
          break
        }
        await db.doc(`tenants/${tenantId}/subscriptions/current`).set(
          {
            status: mapStripeStatus(subscription.status),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const tenantId = subscription.metadata.tenantId
        if (!tenantId) {
          logger.error('stripeWebhook: subscription missing tenantId metadata', subscription.id)
          break
        }
        await db.doc(`tenants/${tenantId}/subscriptions/current`).set(
          {
            plan: 'free',
            status: 'free',
            stripeSubscriptionId: null,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        )
        break
      }

      default:
        // Not an event type this pipeline acts on - Stripe sends many more
        // than we subscribe to.
        break
    }

    res.status(200).send()
  },
)

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due'
  return 'canceled'
}

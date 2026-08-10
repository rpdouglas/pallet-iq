import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import Stripe from 'stripe'
import { stripeProPriceId, stripeSecretKey } from './params'
import type { SubscriptionDoc } from './types'

interface CreateCheckoutSessionRequest {
  successUrl?: unknown
  cancelUrl?: unknown
}

// PALLETIQ-003 / ADR-0005. Owner-only: creates a Stripe Checkout Session for
// the tenant's Pro upgrade and returns its redirect URL. Stripe's hosted
// page owns card entry/PCI compliance - this function never touches raw
// card data. Subscription state itself is written by stripeWebhook, not
// here - a Checkout Session being created doesn't mean the tenant paid.
export const createCheckoutSession = onCall<CreateCheckoutSessionRequest, Promise<{ url: string }>>(
  { secrets: [stripeSecretKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.')
    }

    const { tenantId, role } = request.auth.token
    if (typeof tenantId !== 'string' || role !== 'owner') {
      throw new HttpsError('permission-denied', 'Only a tenant owner can manage billing.')
    }

    const successUrl = typeof request.data.successUrl === 'string' ? request.data.successUrl : ''
    const cancelUrl = typeof request.data.cancelUrl === 'string' ? request.data.cancelUrl : ''
    if (!successUrl || !cancelUrl) {
      throw new HttpsError('invalid-argument', 'successUrl and cancelUrl are required.')
    }

    const db = getFirestore()
    const subRef = db.doc(`tenants/${tenantId}/subscriptions/current`)
    const subSnap = await subRef.get()
    const existingCustomerId =
      (subSnap.data() as SubscriptionDoc | undefined)?.stripeCustomerId ?? null

    const stripe = new Stripe(stripeSecretKey.value())
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: stripeProPriceId.value(), quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: tenantId,
      // Stamped onto the resulting Subscription object too, not just this
      // Session - customer.subscription.updated/deleted webhook events only
      // carry the Subscription, so this is how the webhook maps back to a
      // tenant for those without a Firestore lookup.
      subscription_data: { metadata: { tenantId } },
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: request.auth.token.email }),
    })

    if (!session.url) {
      throw new HttpsError('internal', 'Stripe did not return a Checkout Session URL.')
    }

    return { url: session.url }
  },
)

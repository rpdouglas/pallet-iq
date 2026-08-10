import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet }))
const mockSessionsCreate = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
}))

vi.mock('./params', () => ({
  stripeSecretKey: { value: () => 'sk_test_mock' },
  stripeProPriceId: { value: () => 'price_mock' },
}))

vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: mockSessionsCreate } }
  },
}))

const { createCheckoutSession } = await import('./createCheckoutSession')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

const ownerAuth = {
  uid: 'owner-uid',
  token: { tenantId: 'tenant-a', role: 'owner', email: 'owner@example.com' },
} as CallableRequest['auth']

const validData = {
  successUrl: 'https://app.example.com/billing?success=1',
  cancelUrl: 'https://app.example.com/billing?canceled=1',
}

beforeEach(() => {
  mockDoc.mockClear()
  mockGet.mockClear()
  mockSessionsCreate.mockClear()
  mockGet.mockResolvedValue({ exists: false, data: () => undefined })
  mockSessionsCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session/xyz' })
})

describe('createCheckoutSession', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(createCheckoutSession.run(request(validData, undefined))).rejects.toThrow(
      /sign in/i,
    )
  })

  it('rejects a non-owner caller', async () => {
    const managerAuth = {
      uid: 'manager-uid',
      token: { tenantId: 'tenant-a', role: 'manager' },
    } as CallableRequest['auth']

    await expect(createCheckoutSession.run(request(validData, managerAuth))).rejects.toThrow(
      /only a tenant owner/i,
    )
  })

  it('rejects missing successUrl/cancelUrl', async () => {
    await expect(
      createCheckoutSession.run(request({ successUrl: 'https://x' }, ownerAuth)),
    ).rejects.toThrow(/successUrl and cancelUrl/i)
  })

  it('creates a Checkout Session with tenant correlation and no prior customer', async () => {
    const result = await createCheckoutSession.run(request(validData, ownerAuth))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/subscriptions/current')
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_mock', quantity: 1 }],
        client_reference_id: 'tenant-a',
        subscription_data: { metadata: { tenantId: 'tenant-a' } },
        customer_email: 'owner@example.com',
      }),
    )
    expect(result).toEqual({ url: 'https://checkout.stripe.com/session/xyz' })
  })

  it('reuses an existing Stripe customer instead of customer_email', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ stripeCustomerId: 'cus_existing' }),
    })

    await createCheckoutSession.run(request(validData, ownerAuth))

    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' }),
    )
    const [sessionArgs] = mockSessionsCreate.mock.calls[0] as [Record<string, unknown>]
    expect(sessionArgs).not.toHaveProperty('customer_email')
  })

  it('throws if Stripe returns no session URL', async () => {
    mockSessionsCreate.mockResolvedValueOnce({ url: null })

    await expect(createCheckoutSession.run(request(validData, ownerAuth))).rejects.toThrow(
      /did not return a Checkout Session URL/i,
    )
  })
})

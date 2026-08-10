import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockSet = vi.fn()
const mockDoc = vi.fn(() => ({ set: mockSet }))
const mockConstructEvent = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: mockLoggerError },
}))

vi.mock('./params', () => ({
  stripeSecretKey: { value: () => 'sk_test_mock' },
  stripeWebhookSecret: { value: () => 'whsec_mock' },
}))

vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: mockConstructEvent }
  },
}))

const { stripeWebhook } = await import('./stripeWebhook')

function mockReq(headers: Record<string, string>, rawBody = Buffer.from('{}')) {
  return { headers, rawBody } as never
}

function mockRes() {
  const res = {
    status: vi.fn(),
    send: vi.fn(),
  }
  res.status.mockReturnValue(res)
  res.send.mockReturnValue(res)
  return res as never as { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  mockSet.mockClear()
  mockDoc.mockClear()
  mockConstructEvent.mockReset()
  mockLoggerError.mockClear()
})

describe('stripeWebhook', () => {
  it('rejects a request with no Stripe-Signature header', async () => {
    const res = mockRes()

    await stripeWebhook(mockReq({}), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockConstructEvent).not.toHaveBeenCalled()
  })

  it('rejects a request with an invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature')
    })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('handles checkout.session.completed by activating Pro', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'tenant-a',
          customer: 'cus_1',
          subscription: 'sub_1',
        },
      },
    })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/subscriptions/current')
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
      }),
      { merge: true },
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('logs and skips checkout.session.completed with no client_reference_id', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { client_reference_id: null } },
    })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(mockSet).not.toHaveBeenCalled()
    expect(mockLoggerError).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('syncs status on customer.subscription.updated', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: { status: 'past_due', metadata: { tenantId: 'tenant-a' } } },
    })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'past_due' }), {
      merge: true,
    })
  })

  it('reverts to free on customer.subscription.deleted', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { metadata: { tenantId: 'tenant-a' } } },
    })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free', status: 'free', stripeSubscriptionId: null }),
      { merge: true },
    )
  })

  it('logs and skips subscription events with no tenantId metadata', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1', metadata: {} } },
    })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(mockSet).not.toHaveBeenCalled()
    expect(mockLoggerError).toHaveBeenCalled()
  })

  it('acknowledges unrecognized event types without writing', async () => {
    mockConstructEvent.mockReturnValue({ type: 'invoice.paid', data: { object: {} } })
    const res = mockRes()

    await stripeWebhook(mockReq({ 'stripe-signature': 'sig' }), res)

    expect(mockSet).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})

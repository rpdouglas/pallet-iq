import { describe, expect, it, vi, beforeEach } from 'vitest'
import { verifyPricingComps } from './verifyComps'
import type { PricingResult } from './types'

const BASE_PRICING: PricingResult = {
  msrp: 100,
  salePrice: 70,
  salePriceLow: 60,
  salePriceHigh: 80,
  liquidationPrice: 30,
  confidence: 0.7,
  sampleSize: 3,
  factors: [{ label: 'Condition: good', direction: 'neutral', explanation: null }],
  comps: [],
  waterfallStepsUsed: ['retail'],
}

function mockFetchResponse(ok: boolean, url: string, status = ok ? 200 : 404) {
  return { ok, url, status } as Response
}

const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('verifyPricingComps', () => {
  it('returns the pricing unchanged when there are no comps', async () => {
    const result = await verifyPricingComps(BASE_PRICING)

    expect(result).toBe(BASE_PRICING)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('keeps a comp whose URL resolves to the expected domain for its source', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse(true, 'https://www.kijiji.ca/v-item/123'))
    const pricing = {
      ...BASE_PRICING,
      comps: [
        {
          title: 'Kijiji listing',
          price: 50,
          url: 'https://kijiji.ca/v-item/123',
          source: 'kijiji_new' as const,
        },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0].url).toBe('https://kijiji.ca/v-item/123')
    expect(result.factors).toEqual(pricing.factors)
  })

  it('accepts a redirect that lands on the expected domain', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse(true, 'https://www.ebay.com/itm/456'))
    const pricing = {
      ...BASE_PRICING,
      comps: [
        { title: 'eBay sold', price: 60, url: 'https://ebay.ca/x', source: 'ebay_sold' as const },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0].url).toBe('https://ebay.ca/x')
  })

  it('nulls the url and adds a factor when a comp URL fails to resolve (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'))
    const pricing = {
      ...BASE_PRICING,
      comps: [
        {
          title: 'Suspicious listing',
          price: 45,
          url: 'https://not-real-kijiji.example/x',
          source: 'kijiji_used' as const,
        },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0]).toEqual({
      title: 'Suspicious listing',
      price: 45,
      url: null,
      source: 'kijiji_used',
    })
    expect(result.factors).toContainEqual({
      label: '1 comp link(s) could not be verified and were shown without a link',
      direction: 'down',
      explanation: null,
    })
  })

  it('nulls the url when the response is a non-2xx status', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse(false, 'https://kijiji.ca/v-item/gone'))
    const pricing = {
      ...BASE_PRICING,
      comps: [
        {
          title: 'Dead link',
          price: 40,
          url: 'https://kijiji.ca/v-item/gone',
          source: 'kijiji_new' as const,
        },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0].url).toBeNull()
  })

  it('nulls the url when the response resolves to an unexpected domain', async () => {
    mockFetch.mockResolvedValueOnce(
      mockFetchResponse(true, 'https://evil-lookalike.example/kijiji'),
    )
    const pricing = {
      ...BASE_PRICING,
      comps: [
        {
          title: 'Wrong domain',
          price: 55,
          url: 'https://kijiji.ca.evil-lookalike.example',
          source: 'kijiji_used' as const,
        },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0].url).toBeNull()
  })

  it('passes through a comp with no url unchanged, without fetching', async () => {
    const pricing = {
      ...BASE_PRICING,
      comps: [{ title: 'No link given', price: 30, url: null, source: 'ebay_sold' as const }],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0]).toEqual(pricing.comps[0])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('passes through a comp with no source tag unchanged, without fetching', async () => {
    const pricing = {
      ...BASE_PRICING,
      comps: [{ title: 'Legacy cached comp', price: 30, url: 'https://example.com/x' }],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0]).toEqual(pricing.comps[0])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles a mix of passing and failing comps, counting only the failures in the factor', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse(true, 'https://kijiji.ca/v-item/1'))
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    mockFetch.mockResolvedValueOnce(mockFetchResponse(true, 'https://ebay.ca/itm/2'))
    const pricing = {
      ...BASE_PRICING,
      comps: [
        {
          title: 'Good Kijiji',
          price: 50,
          url: 'https://kijiji.ca/v-item/1',
          source: 'kijiji_new' as const,
        },
        {
          title: 'Bad Kijiji',
          price: 55,
          url: 'https://kijiji.ca/v-item/broken',
          source: 'kijiji_used' as const,
        },
        {
          title: 'Good eBay',
          price: 60,
          url: 'https://ebay.ca/itm/2',
          source: 'ebay_sold' as const,
        },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0].url).toBe('https://kijiji.ca/v-item/1')
    expect(result.comps[1].url).toBeNull()
    expect(result.comps[2].url).toBe('https://ebay.ca/itm/2')
    expect(result.factors).toContainEqual(
      expect.objectContaining({
        label: '1 comp link(s) could not be verified and were shown without a link',
      }),
    )
  })

  it('leaves a comp untouched (no url change, no factor) when the site returns 403 or 429', async () => {
    mockFetch.mockResolvedValueOnce(mockFetchResponse(false, 'https://www.ebay.com/', 403))
    mockFetch.mockResolvedValueOnce(mockFetchResponse(false, 'https://www.kijiji.ca/', 429))
    const pricing = {
      ...BASE_PRICING,
      comps: [
        {
          title: 'Bot-blocked eBay',
          price: 60,
          url: 'https://ebay.ca/itm/9',
          source: 'ebay_sold' as const,
        },
        {
          title: 'Rate-limited Kijiji',
          price: 45,
          url: 'https://kijiji.ca/v-item/9',
          source: 'kijiji_new' as const,
        },
      ],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.comps[0].url).toBe('https://ebay.ca/itm/9')
    expect(result.comps[1].url).toBe('https://kijiji.ca/v-item/9')
    expect(result.factors).toEqual(pricing.factors)
  })

  it('does not change sampleSize when comps fail verification', async () => {
    mockFetch.mockRejectedValueOnce(new Error('down'))
    const pricing = {
      ...BASE_PRICING,
      sampleSize: 5,
      comps: [{ title: 'x', price: 10, url: 'https://kijiji.ca/x', source: 'kijiji_new' as const }],
    }

    const result = await verifyPricingComps(pricing)

    expect(result.sampleSize).toBe(5)
  })
})

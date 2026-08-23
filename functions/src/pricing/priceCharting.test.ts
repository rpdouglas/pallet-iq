import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupPriceCharting } from './priceCharting'

const mockFetch = vi.fn<typeof fetch>()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupPriceCharting', () => {
  it('converts penny prices to dollars on a successful match', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'success',
          'product-name': 'EarthBound',
          'loose-price': 17244,
          'cib-price': 42995,
          'new-price': 53000,
        }),
      ),
    )

    const result = await lookupPriceCharting('token', '045496830434')

    expect(result).toEqual({
      productName: 'EarthBound',
      loosePrice: 172.44,
      cibPrice: 429.95,
      newPrice: 530,
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.pricecharting.com/api/product?t=token&upc=045496830434',
    )
  })

  it('returns null when status is not success', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'error' })))

    expect(await lookupPriceCharting('token', '000000000000')).toBeNull()
  })

  it('returns null on a non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }))

    expect(await lookupPriceCharting('token', '000000000000')).toBeNull()
  })

  it('returns null price fields that are absent from the response', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'success', 'product-name': 'Rare Item' })),
    )

    expect(await lookupPriceCharting('token', '000000000000')).toEqual({
      productName: 'Rare Item',
      loosePrice: null,
      cibPrice: null,
      newPrice: null,
    })
  })
})

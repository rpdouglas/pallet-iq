import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupUpc } from './upcLookup'

const mockFetch = vi.fn<typeof fetch>()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupUpc', () => {
  it('returns title/brand/category and the median offer price on a match', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'OK',
          items: [
            {
              title: 'Diet Coke Soda, 12 pack',
              brand: 'Diet Coke',
              category: 'Food, Beverages & Tobacco > Beverages > Soda',
              lowest_recorded_price: 0,
              highest_recorded_price: 139.99,
              offers: [
                { merchant: 'Staples', price: 15.49 },
                { merchant: 'Walgreens', price: 11.99 },
              ],
            },
          ],
        }),
      ),
    )

    const result = await lookupUpc('049000028911')

    expect(result).toEqual({
      title: 'Diet Coke Soda, 12 pack',
      brand: 'Diet Coke',
      category: 'Food, Beverages & Tobacco > Beverages > Soda',
      medianOfferPrice: 13.74,
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.upcitemdb.com/prod/trial/lookup?upc=049000028911',
    )
  })

  it('ignores zero-price offers when computing the median', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          code: 'OK',
          items: [{ title: 'Widget', offers: [{ price: 0 }, { price: 20 }] }],
        }),
      ),
    )

    const result = await lookupUpc('000000000000')

    expect(result?.medianOfferPrice).toBe(20)
  })

  it('returns null when the code is not OK', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'INVALID_UPC' })))

    expect(await lookupUpc('not-a-upc')).toBeNull()
  })

  it('returns null when no items are returned', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'OK', items: [] })))

    expect(await lookupUpc('000000000000')).toBeNull()
  })

  it('returns null on a non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 429 }))

    expect(await lookupUpc('000000000000')).toBeNull()
  })
})

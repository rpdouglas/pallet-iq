import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupKeepa } from './keepa'

const mockFetch = vi.fn<typeof fetch>()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupKeepa', () => {
  it('extracts the latest sales rank and buy box price', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          products: [
            {
              salesRanks: { '284507': [100000, 5000, 100001, 4200] },
              stats: {
                current: new Array<number>(19).fill(-1).map((v, i) => (i === 18 ? 1999 : v)),
              },
            },
          ],
        }),
      ),
    )

    const result = await lookupKeepa('key', '045496830434')

    expect(result).toEqual({ salesRank: 4200, buyBoxPrice: 19.99 })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.keepa.com/product?key=key&domain=1&code=045496830434',
    )
  })

  it('treats the -1 sentinel as no buy box price data', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          products: [{ salesRanks: { '284507': [100000, 5000] }, stats: { current: [] } }],
        }),
      ),
    )

    const result = await lookupKeepa('key', '045496830434')

    expect(result).toEqual({ salesRank: 5000, buyBoxPrice: null })
  })

  it('returns null when no product matches', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ products: [] })))

    expect(await lookupKeepa('key', '000000000000')).toBeNull()
  })

  it('returns null when neither sales rank nor buy box price is available', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ products: [{ salesRanks: {}, stats: { current: [] } }] })),
    )

    expect(await lookupKeepa('key', '000000000000')).toBeNull()
  })

  it('returns null on a non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }))

    expect(await lookupKeepa('key', '000000000000')).toBeNull()
  })
})

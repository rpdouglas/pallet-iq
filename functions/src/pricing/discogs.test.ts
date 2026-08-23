import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupDiscogs } from './discogs'

const mockFetch = vi.fn<typeof fetch>()

afterEach(() => {
  vi.unstubAllGlobals()
})

function requestInit(call: readonly [RequestInfo | URL, RequestInit?]): RequestInit {
  const init = call[1]
  if (!init) {
    throw new Error('Expected a fetch call with a RequestInit second argument.')
  }
  return init
}

describe('lookupDiscogs', () => {
  it('searches for a release then returns its marketplace stats', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ id: 2825456 }] })))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            num_for_sale: 38,
            lowest_price: { value: 13.0, currency: 'USD' },
            blocked_from_sale: false,
          }),
        ),
      )

    const result = await lookupDiscogs('Miles Davis Kind Of Blue')

    expect(result).toEqual({ numForSale: 38, lowestPrice: 13.0 })
    const searchCall = mockFetch.mock.calls[0]
    expect(searchCall[0]).toContain('q=Miles%20Davis%20Kind%20Of%20Blue')
    const userAgent = (requestInit(searchCall).headers as Record<string, string>)['User-Agent']
    expect(userAgent).toContain('PalletIQ')
    expect(mockFetch.mock.calls[1][0]).toBe(
      'https://api.discogs.com/marketplace/stats/2825456?curr_abbr=USD',
    )
  })

  it('returns null when the search finds no release', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ results: [] })))

    expect(await lookupDiscogs('nonexistent release')).toBeNull()
  })

  it('returns null when the release is blocked from sale', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ id: 1 }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ blocked_from_sale: true })))

    expect(await lookupDiscogs('some release')).toBeNull()
  })

  it('returns null on a failed search request', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 500 }))

    expect(await lookupDiscogs('some release')).toBeNull()
  })

  it('returns null on a failed stats request', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ id: 1 }] })))
      .mockResolvedValueOnce(new Response('', { status: 500 }))

    expect(await lookupDiscogs('some release')).toBeNull()
  })
})

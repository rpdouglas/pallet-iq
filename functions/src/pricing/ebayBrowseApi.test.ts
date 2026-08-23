import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchActiveListings } from './ebayBrowseApi'

const mockFetch = vi.fn<typeof fetch>()

afterEach(() => {
  vi.unstubAllGlobals()
})

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: 'fake-token' }))
}

function requestInit(call: readonly [RequestInfo | URL, RequestInit?]): RequestInit {
  const init = call[1]
  if (!init) {
    throw new Error('Expected a fetch call with a RequestInit second argument.')
  }
  return init
}

describe('searchActiveListings', () => {
  it('mints a token then returns parsed, priced listings', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          itemSummaries: [
            {
              title: 'Instant Pot Duo 6-Quart',
              price: { value: '79.99' },
              itemWebUrl: 'https://ebay.com/1',
            },
            {
              title: 'Instant Pot Duo 6-Quart Used',
              price: { value: '54.50' },
              itemWebUrl: 'https://ebay.com/2',
            },
          ],
        }),
      ),
    )

    const result = await searchActiveListings('app-id', 'cert-id', 'Instant Pot Duo 6-Quart')

    expect(result).toEqual([
      { title: 'Instant Pot Duo 6-Quart', price: 79.99, url: 'https://ebay.com/1' },
      { title: 'Instant Pot Duo 6-Quart Used', price: 54.5, url: 'https://ebay.com/2' },
    ])

    const tokenCall = mockFetch.mock.calls[0]
    expect(tokenCall[0]).toBe('https://api.ebay.com/identity/v1/oauth2/token')
    const tokenInit = requestInit(tokenCall)
    expect(tokenInit.method).toBe('POST')
    expect((tokenInit.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('app-id:cert-id').toString('base64')}`,
    )

    const searchCall = mockFetch.mock.calls[1]
    expect(searchCall[0]).toContain('q=Instant%20Pot%20Duo%206-Quart')
    const searchInit = requestInit(searchCall)
    expect((searchInit.headers as Record<string, string>).Authorization).toBe('Bearer fake-token')
    expect((searchInit.headers as Record<string, string>)['X-EBAY-C-MARKETPLACE-ID']).toBe(
      'EBAY_US',
    )
  })

  it('filters out listings with no title or an invalid/zero price', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          itemSummaries: [
            { title: '', price: { value: '10.00' } },
            { title: 'No price' },
            { title: 'Zero price', price: { value: '0' } },
            { title: 'Valid', price: { value: '12.34' }, itemWebUrl: 'https://ebay.com/3' },
          ],
        }),
      ),
    )

    const result = await searchActiveListings('app-id', 'cert-id', 'query')

    expect(result).toEqual([{ title: 'Valid', price: 12.34, url: 'https://ebay.com/3' }])
  })

  it('returns an empty array when the search request fails', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response('', { status: 500 }))

    expect(await searchActiveListings('app-id', 'cert-id', 'query')).toEqual([])
  })

  it('throws when the OAuth token request fails', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 401 }))

    await expect(searchActiveListings('app-id', 'cert-id', 'query')).rejects.toThrow(
      /token request failed/i,
    )
  })
})

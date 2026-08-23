import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupGoogleBooks } from './googleBooks'

const mockFetch = vi.fn<typeof fetch>()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lookupGoogleBooks', () => {
  it('returns the title and list price on a match', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          totalItems: 1,
          items: [
            {
              volumeInfo: { title: 'Atomic Habits' },
              saleInfo: { listPrice: { amount: 27.0 } },
            },
          ],
        }),
      ),
    )

    const result = await lookupGoogleBooks('9780735211292')

    expect(result).toEqual({ title: 'Atomic Habits', listPrice: 27.0 })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn%3A9780735211292',
    )
  })

  it('returns a null listPrice when the volume has no sale info', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ totalItems: 1, items: [{ volumeInfo: { title: 'Some Book' } }] }),
      ),
    )

    expect(await lookupGoogleBooks('0000000000000')).toEqual({
      title: 'Some Book',
      listPrice: null,
    })
  })

  it('returns null when no volumes are found', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ totalItems: 0 })))

    expect(await lookupGoogleBooks('0000000000000')).toBeNull()
  })

  it('returns null on a non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce(new Response('', { status: 429 }))

    expect(await lookupGoogleBooks('0000000000000')).toBeNull()
  })
})

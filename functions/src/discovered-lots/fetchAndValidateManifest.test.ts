import { describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const { fetchAndValidateManifest } = await import('./fetchAndValidateManifest')

function fakeResponse(opts: {
  ok?: boolean
  status?: number
  contentType?: string | null
  contentLength?: string | null
  body: string
}) {
  const buffer = Buffer.from(opts.body)
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    headers: {
      get: (name: string) => {
        if (name === 'content-type') return opts.contentType ?? null
        if (name === 'content-length') return opts.contentLength ?? buffer.length.toString()
        return null
      },
    },
    arrayBuffer: () =>
      Promise.resolve(
        buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      ),
  }
}

const CSV_BODY = 'UPC,Merchant SKU,Quantity,Title,MSRP,Extended\n012345,ABC,1,Widget,10,10\n'

function expectFailure(
  result: Awaited<ReturnType<typeof fetchAndValidateManifest>>,
  pattern: RegExp,
) {
  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.error).toMatch(pattern)
  }
}

describe('fetchAndValidateManifest', () => {
  it('rejects an invalid URL', async () => {
    const result = await fetchAndValidateManifest('not a url')
    expectFailure(result, /not a valid url/i)
  })

  it('rejects a non-restock.ca host', async () => {
    const result = await fetchAndValidateManifest('https://evil.example.com/manifest.csv')
    expectFailure(result, /allowlisted host/i)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a non-https URL even on the allowlisted host', async () => {
    const result = await fetchAndValidateManifest('http://restock.ca/manifest.csv')
    expectFailure(result, /allowlisted host/i)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a failed fetch response', async () => {
    mockFetch.mockResolvedValueOnce(fakeResponse({ ok: false, status: 404, body: '' }))

    const result = await fetchAndValidateManifest('https://www.restock.ca/manifest.csv')
    expectFailure(result, /status 404/)
  })

  it('rejects a response over the size cap via content-length', async () => {
    mockFetch.mockResolvedValueOnce(
      fakeResponse({ contentLength: (11 * 1024 * 1024).toString(), body: CSV_BODY }),
    )

    const result = await fetchAndValidateManifest('https://www.restock.ca/manifest.csv')
    expectFailure(result, /maximum file size/i)
  })

  it('accepts a valid CSV manifest from an allowlisted subdomain', async () => {
    mockFetch.mockResolvedValueOnce(fakeResponse({ contentType: 'text/csv', body: CSV_BODY }))

    const result = await fetchAndValidateManifest('https://files.restock.ca/manifest.csv')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.format).toBe('csv')
      expect(result.buffer.toString()).toBe(CSV_BODY)
    }
  })

  it('accepts a CSV manifest with no/ambiguous Content-Type by falling back to csv first', async () => {
    mockFetch.mockResolvedValueOnce(fakeResponse({ contentType: null, body: CSV_BODY }))

    const result = await fetchAndValidateManifest('https://www.restock.ca/manifest')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.format).toBe('csv')
    }
  })

  it('rejects an unsupported format (e.g. a PDF) with an explicit message', async () => {
    // Binary content with an early NUL byte and no ZIP signature - fails
    // both the csv and xlsx validateFile checks, same as a real PDF would.
    const pdfLikeBody = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x01, 0x02])
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (name: string) => (name === 'content-type' ? 'application/pdf' : null) },
      arrayBuffer: () =>
        Promise.resolve(
          pdfLikeBody.buffer.slice(
            pdfLikeBody.byteOffset,
            pdfLikeBody.byteOffset + pdfLikeBody.byteLength,
          ),
        ),
    })

    const result = await fetchAndValidateManifest('https://www.restock.ca/manifest.pdf')
    expectFailure(result, /not available in a supported format/i)
  })

  // Real live-verification finding (2026-08-24): every restock_lots.manifestUrl
  // in production actually points to a category listing page, not a real
  // manifest - a pre-existing fetchManifestLink.ts bug, out of this ticket's
  // scope to fix. The real response has no NUL byte in its first 8KB, so
  // validateCsv's weak heuristic alone would wrongly accept it - this must be
  // rejected via Content-Type/content sniffing before ever reaching
  // validateFile.
  it('rejects a real HTML category page (text/html, no NUL byte) rather than accepting it as CSV', async () => {
    const htmlBody =
      '<!DOCTYPE html>\n<html><head><title>Unmanifested Furniture</title></head></html>'
    mockFetch.mockResolvedValueOnce(
      fakeResponse({ contentType: 'text/html; charset=UTF-8', body: htmlBody }),
    )

    const result = await fetchAndValidateManifest(
      'https://www.restock.ca/furniture/unmanifested-furniture/',
    )
    expectFailure(result, /not available in a supported format/i)
  })

  it('rejects HTML content even when Content-Type is missing/ambiguous', async () => {
    const htmlBody = '<html><body>redirected</body></html>'
    mockFetch.mockResolvedValueOnce(fakeResponse({ contentType: null, body: htmlBody }))

    const result = await fetchAndValidateManifest('https://www.restock.ca/manifest')
    expectFailure(result, /not available in a supported format/i)
  })
})

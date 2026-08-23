// PALLETIQ-027 / ADR-0011. Google Books - ISBN-barcoded books. Free,
// officially documented as needing no API key for volumes.list. Note: this
// sandbox's own anonymous quota was already exhausted when checked during
// planning (a shared-IP artifact, not evidence the endpoint doesn't work) -
// endpoint/response shape confirmed from Google's own published docs.
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes'

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string
  }
  saleInfo?: {
    listPrice?: { amount?: number }
  }
}

interface GoogleBooksResponse {
  totalItems?: number
  items?: GoogleBooksVolume[]
}

export interface GoogleBooksResult {
  title: string | null
  listPrice: number | null
}

export async function lookupGoogleBooks(isbn: string): Promise<GoogleBooksResult | null> {
  const url = `${BASE_URL}?q=${encodeURIComponent(`isbn:${isbn}`)}`
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as GoogleBooksResponse
  const volume = data.items?.[0]
  if (!data.totalItems || !volume) {
    return null
  }

  return {
    title: volume.volumeInfo?.title ?? null,
    listPrice: volume.saleInfo?.listPrice?.amount ?? null,
  }
}

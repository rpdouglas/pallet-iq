// PALLETIQ-026 / ADR-0011. UPCItemDB's free "trial" tier - no signup, no
// API key, 100 lookups/day - verified live against the real endpoint
// during planning (see this ticket's close-out notes). No secret needed,
// matching ADR-0011's "Discogs and Google Books' free tiers need no
// secret" precedent.
const TRIAL_ENDPOINT = 'https://api.upcitemdb.com/prod/trial/lookup'

interface UpcItemDbOffer {
  price?: number
}

interface UpcItemDbItem {
  title?: string
  brand?: string
  category?: string
  offers?: UpcItemDbOffer[]
}

interface UpcItemDbResponse {
  code: string
  items?: UpcItemDbItem[]
}

export interface UpcLookupResult {
  title: string | null
  brand: string | null
  category: string | null
  // Median of offers[].price. UPCItemDB's own lowest_recorded_price/
  // highest_recorded_price fields are noisy in practice (lowest_recorded_price
  // is frequently 0, highest_recorded_price can be an outlier far above real
  // retail offers) - the actual per-merchant offers array is the more
  // reliable retail-price signal.
  medianOfferPrice: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? null)
}

export async function lookupUpc(upc: string): Promise<UpcLookupResult | null> {
  const response = await fetch(`${TRIAL_ENDPOINT}?upc=${encodeURIComponent(upc)}`)
  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as UpcItemDbResponse
  const item = data.items?.[0]
  if (data.code !== 'OK' || !item) {
    return null
  }

  const offerPrices = (item.offers ?? [])
    .map((offer) => offer.price)
    .filter((price): price is number => typeof price === 'number' && price > 0)

  return {
    title: item.title ?? null,
    brand: item.brand ?? null,
    category: item.category ?? null,
    medianOfferPrice: median(offerPrices),
  }
}

// PALLETIQ-027 / ADR-0011. PriceCharting - games/cards/collectibles/LEGO
// price guide. Paid, per-call token (`PRICECHARTING_API_KEY`). Live
// verification deferred until the owner provisions a real account (mirrors
// PALLETIQ-026's eBay precedent) - field names below (loose-price,
// cib-price, new-price, prices in pennies) are confirmed via PriceCharting's
// own published API documentation example, not guessed.
const BASE_URL = 'https://www.pricecharting.com/api/product'

interface PriceChartingResponse {
  status?: string
  'product-name'?: string
  'loose-price'?: number
  'cib-price'?: number
  'new-price'?: number
}

export interface PriceChartingResult {
  productName: string | null
  /** "Complete in box" / good-condition price, in dollars. */
  cibPrice: number | null
  /** New/sealed price, in dollars. */
  newPrice: number | null
  /** Loose/used price, in dollars. */
  loosePrice: number | null
}

export async function lookupPriceCharting(
  apiKey: string,
  upc: string,
): Promise<PriceChartingResult | null> {
  const url = `${BASE_URL}?t=${encodeURIComponent(apiKey)}&upc=${encodeURIComponent(upc)}`
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as PriceChartingResponse
  if (data.status !== 'success') {
    return null
  }

  // PriceCharting represents prices as an integer number of pennies.
  const toDollars = (cents: number | undefined): number | null =>
    typeof cents === 'number' ? cents / 100 : null

  return {
    productName: data['product-name'] ?? null,
    cibPrice: toDollars(data['cib-price']),
    newPrice: toDollars(data['new-price']),
    loosePrice: toDollars(data['loose-price']),
  }
}

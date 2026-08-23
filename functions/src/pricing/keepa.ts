// PALLETIQ-027 / ADR-0011. Keepa - Amazon price history, sales rank, buy
// box price, matched by UPC/EAN (Keepa's own docs confirm product lookups
// accept UPC/EAN/ISBN-13 in addition to ASIN, so this reuses the same
// barcodeNumber already captured for the UPC-lookup step, no separate
// ASIN-resolution step needed).
//
// UNVERIFIED FIELD SHAPE: Keepa's official docs page (keepa.com/api-docs)
// returned a JS-rendered shell to every fetch attempt during this ticket's
// planning (couldn't get past it even with a browser user-agent), and
// Keepa requires a paid account to test live. The field names below
// (`salesRanks`, `stats.current[18]` for buy box price, prices in cents)
// follow Keepa's widely-referenced CSV_TYPE convention from their Python/
// Java client ecosystem, not a response this code has actually seen - this
// is the one specialist source in this ticket with real schema risk, not
// just a missing-credential risk. Parsing is deliberately defensive (every
// field access falls back to null rather than throwing) so a wrong
// assumption here degrades to "no Keepa signal," not a crash. Re-verify
// field names against a real response before trusting this in production.
const BASE_URL = 'https://api.keepa.com/product'

// Keepa's CSV_TYPE index for Buy Box Price, per community documentation.
const BUY_BOX_CSV_INDEX = 18
const NO_DATA_SENTINEL = -1

interface KeepaProduct {
  salesRanks?: Record<string, number[]>
  stats?: { current?: number[] }
}

interface KeepaResponse {
  products?: KeepaProduct[]
}

export interface KeepaResult {
  salesRank: number | null
  buyBoxPrice: number | null
}

function extractLatestSalesRank(salesRanks: Record<string, number[]> | undefined): number | null {
  if (!salesRanks) return null
  for (const history of Object.values(salesRanks)) {
    // History is [timestamp, rank, timestamp, rank, ...] - the last value is the most recent rank.
    const rank = history.at(-1)
    if (typeof rank === 'number' && rank > 0) {
      return rank
    }
  }
  return null
}

function extractBuyBoxPrice(current: number[] | undefined): number | null {
  const cents = current?.[BUY_BOX_CSV_INDEX]
  if (typeof cents !== 'number' || cents === NO_DATA_SENTINEL) {
    return null
  }
  return cents / 100
}

export async function lookupKeepa(apiKey: string, code: string): Promise<KeepaResult | null> {
  const url = `${BASE_URL}?key=${encodeURIComponent(apiKey)}&domain=1&code=${encodeURIComponent(code)}`
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as KeepaResponse
  const product = data.products?.[0]
  if (!product) {
    return null
  }

  const salesRank = extractLatestSalesRank(product.salesRanks)
  const buyBoxPrice = extractBuyBoxPrice(product.stats?.current)
  if (salesRank === null && buyBoxPrice === null) {
    return null
  }

  return { salesRank, buyBoxPrice }
}

// PALLETIQ-027 / ADR-0011. Discogs - vinyl/CDs/music media. Free tier, no
// API key required for read-only search/marketplace-stats, but Discogs
// requires a descriptive User-Agent on every request (their API terms) -
// live-verified both endpoints against real data (a Miles Davis release)
// during this ticket's planning.
const SEARCH_URL = 'https://api.discogs.com/database/search'
const STATS_URL = 'https://api.discogs.com/marketplace/stats'
const USER_AGENT = 'PalletIQ/1.0 (+https://github.com/rpdouglas/pallet-iq)'

interface DiscogsSearchResult {
  id: number
}

interface DiscogsSearchResponse {
  results?: DiscogsSearchResult[]
}

interface DiscogsStatsResponse {
  num_for_sale?: number
  lowest_price?: { value?: number; currency?: string } | null
  blocked_from_sale?: boolean
}

export interface DiscogsResult {
  numForSale: number
  lowestPrice: number | null
}

export async function lookupDiscogs(query: string): Promise<DiscogsResult | null> {
  const searchUrl = `${SEARCH_URL}?q=${encodeURIComponent(query)}&type=release&per_page=1`
  const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } })
  if (!searchResponse.ok) {
    return null
  }
  const searchData = (await searchResponse.json()) as DiscogsSearchResponse
  const releaseId = searchData.results?.[0]?.id
  if (!releaseId) {
    return null
  }

  const statsUrl = `${STATS_URL}/${releaseId.toString()}?curr_abbr=USD`
  const statsResponse = await fetch(statsUrl, { headers: { 'User-Agent': USER_AGENT } })
  if (!statsResponse.ok) {
    return null
  }
  const stats = (await statsResponse.json()) as DiscogsStatsResponse
  if (stats.blocked_from_sale) {
    return null
  }

  return {
    numForSale: stats.num_for_sale ?? 0,
    lowestPrice: stats.lowest_price?.value ?? null,
  }
}

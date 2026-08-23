// PALLETIQ-026 / ADR-0011. eBay Browse API - active-listing asking prices
// only (eBay closed logged-out sold-listing access in July 2026; the
// Marketplace Insights API for real sold data is gated, see
// docs/projects/treasure-hunter-plan.md section 3 - deferred to
// PALLETIQ-028). Live verification of this module is deferred until the
// owner provisions a real eBay Developer account (mirrors PALLETIQ-003's
// Stripe precedent) - unit-tested against mocked fetch responses here.
const TOKEN_ENDPOINT = 'https://api.ebay.com/identity/v1/oauth2/token'
const SEARCH_ENDPOINT = 'https://api.ebay.com/buy/browse/v1/item_summary/search'

interface EbayTokenResponse {
  access_token: string
}

interface EbayItemSummary {
  title?: string
  price?: { value?: string }
  itemWebUrl?: string
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[]
}

export interface EbayListing {
  title: string
  price: number
  url: string | null
}

// No token caching - a fresh token per waterfall run is one extra request,
// simpler and more testable than a module-level cache; revisit only if
// real usage volume makes it worth the complexity.
async function getAccessToken(appId: string, certId: string): Promise<string> {
  const basicAuth = Buffer.from(`${appId}:${certId}`).toString('base64')
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  })
  if (!response.ok) {
    throw new Error(`eBay OAuth token request failed: ${response.status.toString()}`)
  }
  const data = (await response.json()) as EbayTokenResponse
  return data.access_token
}

export async function searchActiveListings(
  appId: string,
  certId: string,
  query: string,
  limit = 50,
): Promise<EbayListing[]> {
  const accessToken = await getAccessToken(appId, certId)

  const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&limit=${limit.toString()}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  })
  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as EbaySearchResponse
  return (data.itemSummaries ?? [])
    .map((item): EbayListing => {
      const price = item.price?.value ? Number(item.price.value) : NaN
      return { title: item.title ?? '', price, url: item.itemWebUrl ?? null }
    })
    .filter(
      (listing) => listing.title.length > 0 && Number.isFinite(listing.price) && listing.price > 0,
    )
}

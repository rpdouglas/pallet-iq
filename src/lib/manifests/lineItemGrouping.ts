import type { LineItem } from '../../types/manifest'

// PALLETIQ-055. Mirrors functions/src/manifests/lotProfitability.ts's
// lineItemGroupKey (SKU beats UPC beats normalized description) so
// ManifestDetailPage.tsx can tell a Buyer how many distinct items "Score
// profitability" will research *before* they click it - functions/ and the
// root package can't share code across their separate tsconfigs (same
// constraint documented on landedCost.ts), so this is a deliberate,
// commented-on-both-sides duplicate. Only used for this pre-click estimate,
// never for the actual cap enforcement, which stays server-side.
export function lineItemGroupKey(item: Pick<LineItem, 'sku' | 'upc' | 'description'>): string {
  if (item.sku) {
    return `sku:${item.sku.trim().toLowerCase()}`
  }
  if (item.upc) {
    return `upc:${item.upc.trim()}`
  }
  return `desc:${item.description.trim().toLowerCase().replace(/\s+/g, ' ')}`
}

export function countDistinctLineItemGroups(
  lineItems: readonly Pick<LineItem, 'sku' | 'upc' | 'description'>[],
): number {
  return new Set(lineItems.map(lineItemGroupKey)).size
}

// Mirrors functions/src/manifests/lotProfitability.ts's
// SKU_RESEARCH_CAP_BY_PLAN.free - the tightest per-import cap any tenant
// can be on. Used only to decide whether to show a soft "may not research
// every item" caveat before the count is known to actually get capped
// (this client doesn't know the signed-in tenant's plan), never to predict
// an exact researched count.
export const FREE_TIER_SKU_RESEARCH_CAP = 5

import type { ConditionGrade, ItemScanCandidate } from '../item-scans/types'
import type { PricingFactor } from '../pricing/types'
import type { LineItemDoc, LotProfitabilityResult } from './types'
import { calculateLandedCost, calculateLandedCostMultiplier } from './landedCost'

// PALLETIQ-042 / ADR-0015. Resolves the "per-import SKU research cap"
// open question the ADR flagged as needing a decision before ship. 20
// distinct SKUs x up to 4 Gemini calls each (3 research legs +
// synthesis, mirroring priceResearch.ts) = 80 calls max for one
// profitability-score button click - stays under PALLETIQ-046's
// 100-call/month free-plan cap with headroom for other usage the same
// month, rather than letting one large manifest alone exhaust it.
// Tunable if real usage shows it's too tight/loose.
export const SKU_RESEARCH_CAP = 20

// A restock.ca lot's manifest line items don't grade condition
// (PALLETIQ-052) and neither does most vendor CSV/XLSX data - this is a
// real limitation, not something to guess at from free-text descriptions.
// ADR-0015 is explicit: default and flag it, don't silently infer a
// grade. 'good' is the least-committal grade - not 'new' (overstates
// value for what's usually liquidation/returns stock) and not something
// worse without evidence.
const DEFAULT_CONDITION: ConditionGrade = 'good'
const CONDITION_JUSTIFICATION =
  'Condition not independently verified - manifest data does not grade condition.'

/**
 * Groups line items that represent the same distinct product within one
 * lot, most-specific identifier first: SKU (the vendor's own product
 * identifier) beats UPC (may be shared across minor variants) beats a
 * normalized description (last resort when neither is present).
 */
export function lineItemGroupKey(item: Pick<LineItemDoc, 'sku' | 'upc' | 'description'>): string {
  if (item.sku) {
    return `sku:${item.sku.trim().toLowerCase()}`
  }
  if (item.upc) {
    return `upc:${item.upc.trim()}`
  }
  return `desc:${item.description.trim().toLowerCase().replace(/\s+/g, ' ')}`
}

export interface LineItemGroup {
  key: string
  /** One representative item for this group - used to build the research candidate. */
  representative: LineItemDoc
  quantity: number
  /** Sum of unitCost * quantity across every item in this group. */
  totalValue: number
}

export function groupLineItems(lineItems: readonly LineItemDoc[]): LineItemGroup[] {
  const groups = new Map<string, LineItemGroup>()
  for (const item of lineItems) {
    const key = lineItemGroupKey(item)
    const existing = groups.get(key)
    if (existing) {
      existing.quantity += item.quantity
      existing.totalValue += item.unitCost * item.quantity
    } else {
      groups.set(key, {
        key,
        representative: item,
        quantity: item.quantity,
        totalValue: item.unitCost * item.quantity,
      })
    }
  }
  return Array.from(groups.values())
}

/** Highest-value groups first, capped at SKU_RESEARCH_CAP - the SKUs that dominate the lot's economics get priced first. */
export function selectGroupsToResearch(groups: readonly LineItemGroup[]): LineItemGroup[] {
  return [...groups].sort((a, b) => b.totalValue - a.totalValue).slice(0, SKU_RESEARCH_CAP)
}

export function buildResearchCandidate(item: LineItemDoc): ItemScanCandidate {
  return {
    itemName: item.description,
    brand: null,
    model: null,
    category: item.category ?? 'General',
    dimensions: null,
    notableFeatures: null,
    condition: DEFAULT_CONDITION,
    conditionJustification: CONDITION_JUSTIFICATION,
    confidence: 1,
    barcodeNumber: item.upc,
    groundedRetailPrice: null,
    groundedRetailSource: null,
  }
}

export interface GroupResearchOutcome {
  group: LineItemGroup
  /** null if pricing research ran but found no usable bottom-line price for this SKU. */
  salePrice: number | null
}

/**
 * Aggregates per-SKU research outcomes plus every line item's landed cost
 * into a lot-level profitability result. Landed cost covers every line
 * item (deterministic from the manifest, not Gemini-dependent);
 * projected resale value only covers researched groups - unresearched
 * groups (past the SKU cap, or where research came up empty) contribute
 * cost but no revenue, which understates margin conservatively rather
 * than guessing. `factors` makes that tradeoff visible instead of a
 * silent number.
 */
export function aggregateLotProfitability(
  allLineItems: readonly LineItemDoc[],
  groupsTotal: number,
  outcomes: readonly GroupResearchOutcome[],
  freightCost: number,
  otherFees: number,
): LotProfitabilityResult {
  const totalPurchaseValue = allLineItems.reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
    0,
  )
  const multiplier = calculateLandedCostMultiplier(totalPurchaseValue, freightCost, otherFees)
  const totalLandedCost = allLineItems.reduce(
    (sum, item) => sum + calculateLandedCost(item.unitCost, multiplier) * item.quantity,
    0,
  )

  const projectedResaleValue = outcomes.reduce(
    (sum, outcome) => sum + (outcome.salePrice ?? 0) * outcome.group.quantity,
    0,
  )
  const projectedProfit = projectedResaleValue - totalLandedCost
  const marginPct = totalLandedCost > 0 ? projectedProfit / totalLandedCost : null

  const skusResearched = outcomes.filter((o) => o.salePrice !== null).length
  const skusUnresearched = groupsTotal - outcomes.length
  const skusPricedEmpty = outcomes.length - skusResearched

  const factors: PricingFactor[] = []
  if (groupsTotal === 0) {
    factors.push({ label: 'No line items to score', direction: 'neutral', explanation: null })
  } else if (skusUnresearched > 0) {
    factors.push({
      label: `${outcomes.length.toString()} of ${groupsTotal.toString()} distinct items researched`,
      direction: 'down',
      explanation: `${skusUnresearched.toString()} lower-value item(s) skipped past the per-import research cap - margin is understated, not overstated, since their cost still counts but their resale value doesn't.`,
    })
  } else {
    factors.push({
      label: `All ${groupsTotal.toString()} distinct items researched`,
      direction: 'neutral',
      explanation: null,
    })
  }
  if (skusPricedEmpty > 0) {
    factors.push({
      label: `${skusPricedEmpty.toString()} researched item(s) had no usable price found`,
      direction: 'down',
      explanation: 'Counted as $0 resale value, not excluded - margin is understated, not guessed.',
    })
  }
  factors.push({
    label: 'Condition not independently verified',
    direction: 'neutral',
    explanation: CONDITION_JUSTIFICATION,
  })

  return {
    totalLandedCost,
    projectedResaleValue,
    projectedProfit,
    marginPct,
    skusResearched,
    skusTotal: groupsTotal,
    factors,
  }
}

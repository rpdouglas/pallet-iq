// PALLETIQ-009. Value-weighted allocation of a manifest's shared
// freight/fees across its line items, per the owner-resolved decision in
// docs/BACKLOG.md's PALLETIQ-009 scope note: every line item in the same
// import absorbs the same percentage markup, proportional to its share of
// the import's total purchase value (unitCost * quantity).

export function calculateTotalPurchaseValue(
  lineItems: readonly { unitCost: number; quantity: number }[],
): number {
  return lineItems.reduce((sum, item) => sum + item.unitCost * item.quantity, 0)
}

/** 1 = no markup. totalPurchaseValue <= 0 short-circuits to 1x rather than dividing by zero. */
export function calculateLandedCostMultiplier(
  totalPurchaseValue: number,
  freightCost: number,
  otherFees: number,
): number {
  if (totalPurchaseValue <= 0) {
    return 1
  }
  return 1 + (freightCost + otherFees) / totalPurchaseValue
}

export function calculateLandedCost(unitCost: number, multiplier: number): number {
  return unitCost * multiplier
}

// PALLETIQ-042. Server-side mirror of src/lib/manifests/landedCost.ts's
// formula - functions/ and the root package are separate TypeScript
// projects (functions/tsconfig.json's rootDir is scoped to functions/src,
// no cross-package imports), so this is a deliberate duplication of the
// same math, not a new formula. Keep both in sync if the allocation
// approach ever changes (PALLETIQ-009's scope note).

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

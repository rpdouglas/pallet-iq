import { FactorBreakdownList } from './FactorBreakdownList'
import { formatMoney } from '../lib/format'
import type { LotProfitabilityResult } from '../types/manifest'

// PALLETIQ-042 / ADR-0015. Third real instance of docs/design/
// explainable-scoring.md's score-badge + factor-breakdown pattern (after
// PricingPanel/SaleabilityPanel) - same FactorBreakdownList component,
// different factor set, this time a lot-level aggregate rather than a
// single item. Projected margin is the headline number (the lot-level
// equivalent of a buy-confidence score), landed cost/profit as
// supporting context. p-6, not PricingPanel/SaleabilityPanel's p-8 -
// those scope p-8 to the mobile-first Buyer capture/scan-result flow
// specifically (docs/design/mobile-responsive.md's named exception);
// ManifestDetailPage.tsx is desktop-first, same p-6 as every sibling
// card on that page.
export function LotProfitabilityPanel({
  profitability,
}: {
  profitability: LotProfitabilityResult
}) {
  const marginLabel =
    profitability.marginPct !== null
      ? `${Math.round(profitability.marginPct * 100).toString()}%`
      : '—'

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-metric text-ink-navy font-bold">{marginLabel}</span>
        <span className="text-label text-slate-gray">Projected margin</span>
      </div>
      <p className="text-body text-ink-navy mt-1">
        {formatMoney(profitability.projectedProfit)} projected profit on{' '}
        {formatMoney(profitability.totalLandedCost)} landed cost
      </p>
      <FactorBreakdownList factors={profitability.factors} />
    </div>
  )
}

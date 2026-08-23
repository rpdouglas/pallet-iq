import { FactorBreakdownList } from './FactorBreakdownList'
import type { SaleabilityResult } from '../types/itemScan'

// PALLETIQ-027 / ADR-0011. Second real instance of docs/design/
// explainable-scoring.md's score-badge + factor-breakdown pattern - same
// FactorBreakdownList component PricingPanel uses, different factor set,
// per this ticket's own scope note. Same p-8/44x44px mobile-first density
// as PricingPanel (docs/design/mobile-responsive.md's Buyer-capture-flow
// addendum) since this renders on the same scan-result screen.
export function SaleabilityPanel({ saleability }: { saleability: SaleabilityResult }) {
  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-metric text-ink-navy font-bold">
          {Math.round(saleability.score * 100)}
        </span>
        <span className="text-label text-slate-gray">Saleability score</span>
      </div>
      <FactorBreakdownList factors={saleability.factors} />
    </div>
  )
}

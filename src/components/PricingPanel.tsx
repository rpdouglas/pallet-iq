import { ExternalLink } from 'lucide-react'
import { FactorBreakdownList } from './FactorBreakdownList'
import type { PricingComp, PricingResult } from '../types/itemScan'

function formatCurrency(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(2)}`
}

// PALLETIQ-035 / ADR-0012. Comps now come from mixed sources (eBay sold,
// Kijiji new/sealed, Kijiji used) instead of the single eBay-Browse-API
// pool PALLETIQ-026 had - grouped and labeled per source (via
// PricingComp.source) rather than one flat "eBay listings" block, so each
// group's honesty note matches what that source actually is (eBay sold =
// real sold/completed prices; Kijiji = asking prices, not sold data).
const SOURCE_META: Record<string, { label: string; note: string }> = {
  ebay_sold: { label: 'eBay sold', note: 'Real sold/completed prices.' },
  kijiji_new: { label: 'Kijiji – new/sealed', note: 'Asking prices, not sold data.' },
  kijiji_used: { label: 'Kijiji – used', note: 'Asking prices, not sold data.' },
}

function groupCompsBySource(comps: PricingComp[]): { key: string; comps: PricingComp[] }[] {
  const groups = new Map<string, PricingComp[]>()
  for (const comp of comps) {
    const key = comp.source ?? 'other'
    groups.set(key, [...(groups.get(key) ?? []), comp])
  }
  return Array.from(groups.entries()).map(([key, comps]) => ({ key, comps }))
}

// docs/design/explainable-scoring.md's score-badge + factor-breakdown +
// provenance-labeling pattern, reused directly per ADR-0011 - this is the
// first real shipped instance of that addendum.
//
// This is also the scan-result view docs/design/mobile-responsive.md's
// Buyer-capture-flow addendum names explicitly ("confidence panel, factor
// breakdown... same density and touch-target rules as Warehouse's
// reconciliation screens, not desktop card padding") - p-8 (vs. the
// desktop p-6 used elsewhere, e.g. StatCard.tsx) and every interactive
// element at >=44x44px reflect that, not a literal match to a Warehouse
// reconciliation screen (none exists in code yet to mirror concretely -
// same gap PALLETIQ-025's close-out notes flagged for the bottom-tab-bar
// reference).
//
// Factor rows are NOT sorted by "magnitude of contribution" (the
// addendum's literal spec) - PricingFactor has no magnitude, only a
// direction, since this ticket's factors are a qualitative checklist
// (matching the plan's own mockup: "✓ 18 comps... ✓ Grounding found...")
// not a scored/weighted list. buildFactors() (functions/src/pricing/
// waterfall.ts) orders them by a fixed, documented priority instead.
// PALLETIQ-027's saleability score DOES have real weighted coefficients
// (see computeSaleability.ts) but SaleabilityPanel doesn't sort by them
// either, for the same practical reason: the weights determine each
// term's max possible contribution, not its actual pull for a specific
// scan (a 0.20-weighted term at value 0.1 can matter less than a
// 0.05-weighted term at value 1.0) - computing a true per-factor
// magnitude would need re-deriving each term's marginal contribution to
// the final score, deferred rather than done half-right here.
export function PricingPanel({ pricing }: { pricing: PricingResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-metric text-ink-navy font-bold">
            {formatCurrency(pricing.salePrice)}
          </span>
          <span className="text-label text-slate-gray">
            {Math.round(pricing.confidence * 100)}% confidence
          </span>
        </div>
        <dl className="text-body mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-label text-slate-gray">MSRP</dt>
            <dd className="text-ink-navy font-medium">{formatCurrency(pricing.msrp)}</dd>
          </div>
          <div>
            <dt className="text-label text-slate-gray">Sale range</dt>
            <dd className="text-ink-navy font-medium">
              {pricing.salePriceLow !== null && pricing.salePriceHigh !== null
                ? `${formatCurrency(pricing.salePriceLow)}–${formatCurrency(pricing.salePriceHigh)}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-label text-slate-gray">Liquidation</dt>
            <dd className="text-ink-navy font-medium">
              {formatCurrency(pricing.liquidationPrice)}
            </dd>
          </div>
        </dl>

        <FactorBreakdownList factors={pricing.factors} />
      </div>

      {pricing.comps.length > 0
        ? groupCompsBySource(pricing.comps).map((group) => {
            const meta = SOURCE_META[group.key] ?? { label: 'Comps', note: '' }
            return (
              <div key={group.key} className="rounded-xl bg-white p-8 shadow-sm">
                <h3 className="text-h2 text-ink-navy font-semibold">{meta.label}</h3>
                <p className="text-label text-slate-gray">
                  {group.comps.length} comp(s) found{meta.note ? ` - ${meta.note}` : ''}
                </p>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.comps.map((comp, index) => (
                    <li key={index} className="text-body flex items-center justify-between gap-2">
                      <span className="text-ink-navy truncate">{comp.title}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="text-ink-navy font-medium">
                          {formatCurrency(comp.price)}
                        </span>
                        {comp.url ? (
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`View ${comp.title}`}
                            className="text-brand-blue flex h-11 w-11 items-center justify-center"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })
        : null}
    </div>
  )
}

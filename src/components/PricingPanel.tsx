import { ArrowDown, ArrowUp, ExternalLink, Minus } from 'lucide-react'
import type { PricingFactorDirection, PricingResult } from '../types/itemScan'

function formatCurrency(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(2)}`
}

const DIRECTION_ICON: Record<PricingFactorDirection, typeof ArrowUp> = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: Minus,
}

const DIRECTION_COLOR: Record<PricingFactorDirection, string> = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-slate-gray',
}

// docs/design/explainable-scoring.md's score-badge + factor-breakdown +
// provenance-labeling pattern, reused directly per ADR-0011 - this is the
// first real shipped instance of that addendum. The comps panel is
// deliberately NOT labeled "recent sales" or "sold price" (per the plan's
// own mockup) - PALLETIQ-026 only has the eBay Browse API's active-listing
// asking prices, not real sold data (Marketplace Insights is gated, see
// PALLETIQ-028), so labeling this "sold" would overstate the data.
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
// Magnitude-based sorting is more naturally PALLETIQ-027's territory,
// once the saleability formula has real weighted coefficients to sort by.
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

        <ul className="mt-5 flex flex-col gap-3">
          {pricing.factors.map((factor, index) => {
            const Icon = DIRECTION_ICON[factor.direction]
            return (
              <li key={index} className="flex items-start gap-2">
                <Icon
                  className={`mt-0.5 shrink-0 ${DIRECTION_COLOR[factor.direction]}`}
                  size={14}
                />
                <div>
                  <p className="text-body text-ink-navy leading-relaxed">{factor.label}</p>
                  {factor.explanation ? (
                    <p className="text-label text-slate-gray leading-relaxed">
                      {factor.explanation}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {pricing.comps.length > 0 ? (
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h3 className="text-h2 text-ink-navy font-semibold">
            Active listings (calibrated estimate)
          </h3>
          <p className="text-label text-slate-gray">
            {pricing.sampleSize} active eBay listing(s) found - asking prices, not sold data.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {pricing.comps.map((comp, index) => (
              <li key={index} className="text-body flex items-center justify-between gap-2">
                <span className="text-ink-navy truncate">{comp.title}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-ink-navy font-medium">{formatCurrency(comp.price)}</span>
                  {comp.url ? (
                    <a
                      href={comp.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`View ${comp.title} on eBay`}
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
      ) : null}
    </div>
  )
}

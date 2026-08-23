import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { PricingFactor, PricingFactorDirection } from '../types/itemScan'

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

// docs/design/explainable-scoring.md's factor-breakdown pattern - shared by
// PricingPanel (PALLETIQ-026) and SaleabilityPanel (PALLETIQ-027), "same
// component, different factor set" per PALLETIQ-027's own scope note.
export function FactorBreakdownList({ factors }: { factors: PricingFactor[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-3">
      {factors.map((factor, index) => {
        const Icon = DIRECTION_ICON[factor.direction]
        return (
          <li key={index} className="flex items-start gap-2">
            <Icon className={`mt-0.5 shrink-0 ${DIRECTION_COLOR[factor.direction]}`} size={14} />
            <div>
              <p className="text-body text-ink-navy leading-relaxed">{factor.label}</p>
              {factor.explanation ? (
                <p className="text-label text-slate-gray leading-relaxed">{factor.explanation}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

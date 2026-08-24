import type { ReactNode } from 'react'

export type BadgeTone = 'amber' | 'emerald' | 'sky' | 'slate'

// docs/design/components.md's Badges/pills pattern (PALLETIQ-050). `slate`
// is the neutral default for tags that aren't semantically color-coded
// (e.g. a category tag); amber/emerald/sky are the badge-scoped tokens
// from Pallet-IQ-Design-System.md §2 - don't reuse them outside a badge.
const TONE_CLASSES: Record<BadgeTone, string> = {
  amber: 'bg-amber/10 text-amber',
  emerald: 'bg-emerald/10 text-emerald',
  sky: 'bg-sky/10 text-sky',
  slate: 'bg-slate-gray/10 text-slate-gray',
}

export function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`text-label inline-block rounded-full px-2.5 py-0.5 font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}

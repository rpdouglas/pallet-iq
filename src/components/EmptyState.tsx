import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  action?: ReactNode
}

// docs/design/components.md's Empty States pattern: centered icon (Lucide,
// Slate Gray) + short message (Body, Ink Navy) + one primary action where a
// real next step exists. `action` is optional on purpose - components.md
// warns against a dead-end CTA to nothing, so callers with no real next step
// yet (see PALLETIQ-006's landing placeholder) omit it rather than fake one.
export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Icon className="text-slate-gray" size={40} strokeWidth={1.5} />
      <p className="text-body text-ink-navy">{message}</p>
      {action}
    </div>
  )
}

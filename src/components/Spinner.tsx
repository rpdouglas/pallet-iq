import { Loader2 } from 'lucide-react'

// PALLETIQ-036. First real instance of docs/design/components.md's
// documented-but-never-built "reserve spinners for short, indeterminate
// waits (e.g. a button mid-submit)" rule - every wait in this codebase
// before now used the skeleton-pulse convention instead, even ones this
// short.
export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 role="status" aria-label="Loading" className={`animate-spin ${className}`} />
}

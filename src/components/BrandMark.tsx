import { PackageSearch } from 'lucide-react'

// Icon + wordmark lockup, per docs/design/Pallet-IQ-Design-System.md §1/§3.
// Not the literal split-color logo asset (that's PALLETIQ-017's scope) -
// this is the same plain-text treatment PALLETIQ-016's scaffold used.
export function BrandMark() {
  return (
    <div className="flex flex-col items-center">
      <PackageSearch className="text-brand-blue mb-2" size={32} strokeWidth={1.75} />
      <h1 className="font-display text-h2 text-ink-navy font-extrabold">PalletIQ</h1>
    </div>
  )
}

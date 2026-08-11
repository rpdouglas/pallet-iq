import { PackageSearch } from 'lucide-react'

interface BrandMarkProps {
  /** 'dark' per Pallet-IQ-Design-System.md §1: "All-white on dark or brand-blue backgrounds." */
  variant?: 'light' | 'dark'
  /** false when AppShell renders this in the sidebar on every page - the page's own <h1> stays the sole page heading. */
  asHeading?: boolean
}

// Icon + wordmark lockup, per docs/design/Pallet-IQ-Design-System.md §1/§3.
// Not the literal split-color logo asset (that's PALLETIQ-017's scope) -
// this is the same plain-text treatment PALLETIQ-016's scaffold used.
export function BrandMark({ variant = 'light', asHeading = true }: BrandMarkProps) {
  const textColor = variant === 'dark' ? 'text-white' : 'text-ink-navy'
  const iconColor = variant === 'dark' ? 'text-white' : 'text-brand-blue'
  const wordmarkClassName = `font-display text-h2 font-extrabold ${textColor}`

  return (
    <div className="flex flex-col items-center">
      <PackageSearch className={`${iconColor} mb-2`} size={32} strokeWidth={1.75} />
      {asHeading ? (
        <h1 className={wordmarkClassName}>PalletIQ</h1>
      ) : (
        <span className={wordmarkClassName}>PalletIQ</span>
      )}
    </div>
  )
}

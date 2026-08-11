import palletIqIcon from '../assets/palletiq-icon.png'

interface BrandMarkProps {
  /** 'dark' per Pallet-IQ-Design-System.md §1: "All-white on dark or brand-blue backgrounds." */
  variant?: 'light' | 'dark'
  /** false when AppShell renders this in the sidebar on every page - the page's own <h1> stays the sole page heading. */
  asHeading?: boolean
  /** Shows "Smarter Buys. Higher Profits." below the wordmark - the doc's "Stacked" lockup, for splash-like entry points (AuthCard), not the tighter sidebar. */
  tagline?: boolean
}

// Icon + wordmark (+ optional tagline) lockup, per
// docs/design/Pallet-IQ-Design-System.md §1/§3. The icon itself
// (src/assets/palletiq-icon.png, PALLETIQ-017) is extracted from the
// owner-supplied source lockup (docs/design/assets/) - its internal detail
// (lens interior, pallet face dividers) is genuine negative space in the
// source art, not solid white, so it only reads correctly against a
// colored/dark backdrop. The dark variant (AppShell's navy sidebar) renders
// it directly, matching the source; the light variant (AuthCard's white
// surface) wraps it in a small Brand Blue badge instead - no navy+blue
// two-tone "light" source art exists to do the doc's literal "full color on
// light backgrounds" treatment, see the PALLETIQ-017 scope note in
// docs/BACKLOG.md for the full reasoning.
export function BrandMark({
  variant = 'light',
  asHeading = true,
  tagline = false,
}: BrandMarkProps) {
  const textColor = variant === 'dark' ? 'text-white' : 'text-ink-navy'
  const taglineColor = variant === 'dark' ? 'text-white/70' : 'text-slate-gray'
  const wordmarkClassName = `font-display text-h2 font-extrabold ${textColor}`

  const icon =
    variant === 'dark' ? (
      <img src={palletIqIcon} alt="" className="mb-2 h-10 w-10" />
    ) : (
      <div className="bg-brand-blue mb-2 flex h-12 w-12 items-center justify-center rounded-xl">
        <img src={palletIqIcon} alt="" className="h-8 w-8" />
      </div>
    )

  return (
    <div className="flex flex-col items-center">
      {icon}
      {asHeading ? (
        <h1 className={wordmarkClassName}>PalletIQ</h1>
      ) : (
        <span className={wordmarkClassName}>PalletIQ</span>
      )}
      {tagline ? (
        <p className={`text-label mt-1 tracking-wide uppercase ${taglineColor}`}>
          Smarter Buys. Higher Profits.
        </p>
      ) : null}
    </div>
  )
}

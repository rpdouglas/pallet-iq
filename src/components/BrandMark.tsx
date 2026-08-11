import palletIqIcon from '../assets/palletiq-icon.png'

// Icon + wordmark lockup for AppShell's navy sidebar, per
// docs/design/Pallet-IQ-Design-System.md §1/§3. The icon itself
// (src/assets/palletiq-icon.png, PALLETIQ-017) is extracted from the
// owner-supplied source lockup (docs/design/assets/) - its internal detail
// (lens interior, pallet face dividers) is genuine negative space in the
// source art, not solid white, so it only reads correctly against a
// colored/dark backdrop like this one.
//
// PALLETIQ-019: this used to also cover AuthCard's light-background,
// heading+tagline composition via variant/asHeading/tagline props, but
// AuthCard now renders a single flattened lockup image directly - see that
// ticket's BACKLOG.md scope note. AppShell (always dark, never a page
// heading, no tagline) is the only remaining caller, so those props are
// gone rather than kept unused.
export function BrandMark() {
  return (
    <div className="flex flex-col items-center">
      <img src={palletIqIcon} alt="" className="mb-2 h-10 w-10" />
      <span className="font-display text-h2 font-extrabold text-white">PalletIQ</span>
    </div>
  )
}

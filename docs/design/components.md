# Components — Addendum

Extends [`Pallet-IQ-Design-System.md`](./Pallet-IQ-Design-System.md). Reuses that
doc's palette and type scale — no new values here.

## Why this exists

PalletIQ is a manifest/inventory-heavy app — data tables and forms are load-bearing,
not incidental, and Phase 1's QA verification explicitly requires empty-state UX for
tenant onboarding. The base design system specifies cards, buttons, charts, and nav,
but not these.

## Data tables

- Row height: comfortable enough for Body-size text (14–15px) plus vertical padding
  — don't compress below what the base doc's Body line-height implies.
- Header row: Label/Caption treatment (12–13px, Medium, Slate Gray), sticky on
  scroll for long tables (manifests, inventory lists commonly run long).
- Zebra striping: alternate rows white / Cloud Gray (reuses the base doc's two
  standard surface colors — don't introduce a third).
- Row hover: subtle Cloud Gray background shift, cursor indicates row is
  interactive only if it actually is (don't imply clickability on static rows).
- Numeric columns (cost, quantity, price) right-align; text columns left-align.
- Empty table body uses the Empty States pattern below, not a blank white box.
- **RBAC note:** a column a role can't see is omitted from the table entirely — see
  [`rbac-ui-patterns.md`](./rbac-ui-patterns.md). Don't render it and hide it with CSS.

## Badges / pills

Added for `PALLETIQ-050` (Discovered Lots card view) — the first place a
compact inline tag was needed for something other than plain colored
status text (see `Data tables`' zebra/hover rules above, which already
covers row-level status via text color alone).

- Shape: `rounded-full`, Label/Caption type size (12–13px, Medium).
- Color: a `tone` prop selects one of the badge-scoped tokens from
  `Pallet-IQ-Design-System.md` §2 (`amber` / `emerald` / `sky`) or the
  neutral default (`slate`, for tags that aren't semantically color-coded,
  e.g. a category tag). Background is the tone token at low opacity, text
  is the tone token at full opacity (Tailwind v4 opacity modifiers, e.g.
  `bg-amber/10 text-amber` — no separate background/text token pairs).
- Badges always carry a text label, never color alone — same
  colorblind-accessibility principle as the base doc's delta convention.
- Don't reach for the amber/emerald/sky tokens outside a badge — they're
  scoped to this pattern, not general UI accents (see the Role column in
  `Pallet-IQ-Design-System.md` §2).

## Form inputs

Used across vendor forms, bid entry, settings, manifest upload metadata — React
Hook Form + Zod are already in the stack (`package.json`); this is the visual layer
on top of that validation.

- **Default:** Cloud Gray fill or white with a Slate Gray 1px border, Ink Navy text,
  ~8px radius (matches the base doc's button radius for visual consistency).
- **Focus:** Brand Blue border, no color change to the fill.
- **Error:** red border (matching the delta-red already in the palette for
  consistency, not a new red), error message in the same red directly below the
  field at Label/Caption size — never rely on the border color alone to signal
  error state, since that fails the same colorblind-accessibility principle as the
  delta convention.
- **Disabled:** Cloud Gray fill, Slate Gray text, no border — visually distinct from
  both default and error so a disabled field is never mistaken for an empty
  required one.
- Labels sit above the input (Label/Caption treatment), not as placeholder-only
  text — placeholder-as-label disappears the moment a user starts typing and fails
  accessibility guidance.

## Empty states

Required by Phase 1's QA verification for tenant onboarding, and referenced by the
scoring addendum for "no score yet." Pattern: centered icon (Lucide, Slate Gray) +
short message (Body size, Ink Navy) + one primary action button (per the base doc's
Primary button treatment) where an action exists (e.g. "Import your first
manifest"). Don't show an empty state with no path forward when a clear next action
exists — that's a dead end, not an onboarding moment.

## Loading states

Skeleton blocks (Cloud Gray, subtly animated/shimmering) shaped like the content
they're replacing — a skeleton table has skeleton rows, a skeleton stat card has a
skeleton number where the metric will render. Reserve spinners for short,
indeterminate waits (e.g. a button mid-submit); use skeletons for anything that
takes long enough to show real layout (page loads, async score results per
[`explainable-scoring.md`](./explainable-scoring.md)).

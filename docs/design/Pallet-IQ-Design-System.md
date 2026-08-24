# Pallet IQ — Design System

**Tagline:** Smarter Buys. Higher Profits.
**Brand personality:** Trusted · Smart · Insightful

---

## 1. Logo

**Primary mark:** Pallet icon (isometric wrapped pallet) merged with a magnifying glass containing a bar-chart, paired with the wordmark "Pallet IQ" — "Pallet" in dark navy, "IQ" in brand blue.

**Lockups:**

- **Stacked** — icon above wordmark + tagline, for splash screens, app icons, cover slides
- **Horizontal** — icon beside wordmark, for headers, nav bars, business cards, email signatures

**Clear space:** Maintain padding equal to the height of the "P" in "Pallet" on all sides.

**Color variants:**

- Full color on light backgrounds (navy + blue wordmark)
- All-white on dark or brand-blue backgrounds (as shown in the horizontal lockup)
- Do not recolor the icon independently of the wordmark

**Don'ts:**

- Don't stretch or skew the mark
- Don't place the full-color version on busy photography
- Don't recreate the icon in a different style (flat, outline-only, etc.)

---

## 2. Color Palette

| Swatch | Name        | Hex       | Role                                                                                       |
| ------ | ----------- | --------- | ------------------------------------------------------------------------------------------ |
| 🟦     | Deep Navy   | `#1E3A8A` | Primary brand color, headers, nav background accents                                       |
| 🔵     | Brand Blue  | `#2563EB` | Primary action color — buttons, links, active states, chart lines                          |
| 🟢     | Cyan Accent | `#06B6D4` | Secondary accent — gradients, highlights, icons                                            |
| ⬜     | Cloud Gray  | `#F1F5F9` | Backgrounds, cards, subtle surfaces                                                        |
| ◾     | Slate Gray  | `#475569` | Secondary text, muted labels, inactive icons                                               |
| ⬛     | Ink Navy    | `#0F172A` | Primary text, dark UI surfaces (sidebar, footer)                                           |
| 🟩     | Success     | `#15803D` | Positive deltas (with ↑ arrow), success states, form validation                            |
| 🟥     | Danger      | `#B91C1C` | Negative deltas (with ↓ arrow), error states, destructive actions                          |
| 🟠     | Amber       | `#B45309` | Condition/category badges only — e.g. "Returns"-type conditions (not a general UI accent)  |
| 🟢     | Emerald     | `#047857` | Condition/category badges only — e.g. "Like New"-type conditions (not a general UI accent) |
| 🔷     | Sky         | `#0369A1` | Condition/category badges only — e.g. "New"-type conditions (not a general UI accent)      |

> **Revised 2026-08-24** — Added Amber/Emerald/Sky for the new badge/pill
> pattern (`PALLETIQ-050`, see `components.md`'s Badges section). No
> status/condition tagging tokens existed before this — the existing
> Success/Danger pair is explicitly scoped to deltas/validation/destructive
> actions, not general multi-state badges, so reusing them for conditions
> like "Returns" would misread as an error state. All three are the
> ~700-weight shade of their hue (matching how Success/Danger were
> themselves chosen) to clear WCAG AA (4.5:1) on white: `#B45309` measures
> ~5.0:1, `#047857` ~5.5:1, `#0369A1` ~5.9:1. Scoped to badge use only, per
> the Role column above — not general UI accents.

> **Revised 2026-08-07** — Slate Gray was `#64748B` (Tailwind slate-500); changed to
> `#475569` (slate-600). At `#64748B`, Slate Gray text on a Cloud Gray background
> measured 4.34:1, failing WCAG AA for normal text (needs 4.5:1) — exactly the
> combination this doc prescribes for captions/labels. `#475569` measures 6.92:1 on
> Cloud Gray and 7.58:1 on white; both pass. No other palette values changed.
>
> **Revised 2026-08-10** — Added explicit hex values for Success/Danger. Both were
> referenced repeatedly (delta convention below, `components.md`'s form errors,
> `explainable-scoring.md`'s contribution indicators) but never defined — a real gap
> found while scoping `PALLETIQ-016`'s token wiring. `#15803D` measures 5.01:1 on
> white and `#B91C1C` measures 6.47:1 on white; both pass WCAG AA for normal text
> (needs 4.5:1), consistent with this doc's existing contrast bar.

**Usage guidelines:**

- **Ink Navy** for body copy and headings on light backgrounds
- **Brand Blue → Cyan** gradient for CTAs, banners, and hero sections (see "Trusted · Smart · Insightful" bar) — **never render white text directly on a solid Cyan Accent fill.** At `#06B6D4`, white text measures 2.43:1, failing WCAG AA even for large text (needs 3:1). Cyan Accent is safe for: the blended middle/leading portion of a gradient toward Brand Blue, icon fills/strokes, chart accents and highlights, and text-free decorative surfaces. If text must sit on a solid cyan surface, use Ink Navy (`#0F172A`, 7.35:1 — passes) instead of white.
- **Deep Navy** for the sidebar/nav and structural UI elements
- **Cloud Gray** as the default page/card background — never pure white, to keep the product feeling designed
- **Slate Gray** for timestamps, helper text, and disabled states
- Reserve Success/Danger outside this palette only for data deltas (e.g. "↑18.6%"), form validation, and destructive actions — always pair the color with a directional icon/arrow (for deltas) or explicit text, never color alone, so the signal reads correctly for colorblind users

---

## 3. Typography

- **Wordmark/Display:** Rounded, extra-bold geometric sans (e.g. Poppins ExtraBold / Baloo 2) — used only for the "Pallet IQ" logotype and large marketing headlines. Both are Google Fonts / OFL-licensed — safe for general web use. (**Implemented 2026-08-10, `PALLETIQ-016`** — Poppins ExtraBold is the one actually wired in as `font-display`; Baloo 2 was never installed. Either was acceptable per this doc, this just records which one code depends on so it doesn't drift.)
- **UI/Product font:** **Inter** for all app and dashboard text. (**Revised 2026-08-07** — "SF Pro" was previously listed as an alternative; dropped because Apple restricts SF Pro/SF Pro Text to Apple-platform contexts in its license, so it isn't legally usable as a general webfont. Inter is the sole UI font, no alternative.)
  - **H1 (Page title):** 24–28px, Bold, Ink Navy
  - **H2 (Section header):** 18–20px, Semibold, Ink Navy
  - **Body:** 14–15px, Regular, Ink Navy
  - **Label/Caption:** 12–13px, Medium, Slate Gray
  - **Metric (big numbers):** 28–32px, Bold, Ink Navy

---

## 4. UI Components

**Navigation (sidebar):**

- Background: Deep Navy → Ink Navy vertical gradient
- Active item: Brand Blue pill background, white text
- Inactive items: light gray/white text at reduced opacity
- Icons paired left of each label

**Cards / Stat tiles:**

- Background: white or Cloud Gray
- Rounded corners (~12px), subtle shadow
- Label in Slate Gray, value in bold Ink Navy, delta in green/red with arrow

**Charts:**

- Line/area charts use Brand Blue stroke with a light blue gradient fill beneath
- Gridlines and axis labels in Slate Gray at low opacity

**Buttons:**

- Primary: Brand Blue → Cyan gradient fill, white text, rounded-full or 8px radius
- Secondary: Cloud Gray fill, Ink Navy text
- Ghost/tertiary: transparent, Brand Blue text

**Banners/Callouts:**

- Dark Ink Navy background with Brand Blue accent icon (e.g. the "AI Powered Insights" footer band)
- White heading, light gray supporting text

---

## 5. Iconography

- Simple, geometric, two-tone line/fill icons matching the sidebar set (Dashboard, Manifests, Pallets, Inventory, Analytics, Vendors, Settings)
- Consistent stroke weight; brand blue for active/interactive icons, slate gray for static/inactive
- **Library: [Lucide](https://lucide.dev)** (`lucide-react`) — MIT-licensed, tree-shakeable, and its default style already matches "simple, geometric, two-tone line" without customization. Don't mix in icons from a second library.

## 5a. Dark mode

Explicitly **out of scope for now** — every surface in this doc is specified for
light backgrounds only. Revisit if warehouse mobile-receiving testing (Phase 3)
surfaces a real need (e.g. low-light warehouse floors); don't build a dark variant
speculatively before then.

---

## 6. Voice & Tone

- **Trusted** — precise numbers, no hype
- **Smart** — data-forward language ("AI-Powered Insights," "Smarter Buys")
- **Insightful** — frame features around decisions and outcomes, not just data ("Higher Profits" over "More Data")

---

## 7. Example Applications

- Dashboard: sidebar nav + stat cards + profit trend chart (as shown in reference mock)
- Marketing: horizontal white-on-blue logo lockup for headers, gradient CTA bars for conversion moments
- Data callouts: green "↑" for positive deltas, consistent across ROI, profit, and volume metrics

---

## 8. Addenda

This doc covers brand identity and high-level UI treatment. Product-specific
patterns that extend it live alongside it in `docs/design/` — all reuse the palette
and type scale above rather than introducing new values:

- [`mobile-responsive.md`](./mobile-responsive.md) — breakpoints and the
  mobile-first warehouse / desktop-first buyer split (Phase 3 requirement)
- [`rbac-ui-patterns.md`](./rbac-ui-patterns.md) — how role-denied fields render
  (governance Check III)
- [`explainable-scoring.md`](./explainable-scoring.md) — factor-breakdown
  component for the pallet scoring engine (Phase 2, competitive advantage #1)
- [`components.md`](./components.md) — data tables, form inputs, empty/loading
  states

Adherence to this doc and its addenda is governance **Check IV** — see
`docs/GOVERNANCE.md`.

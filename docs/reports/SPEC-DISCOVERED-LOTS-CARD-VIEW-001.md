# SPEC-DISCOVERED-LOTS-CARD-VIEW-001

**Status:** Draft
**Owner:** Ryan
**Repo:** rpdouglas/pallet-iq
**Target route:** `/discovered` (Discovered lots page)

## 1. Objective

Replace the current table-based rendering of the Discovered Lots page with a
card-based layout on mobile viewports. The existing table requires horizontal
scrolling to see Title, Category, Condition, Units, MSRP, Price, and
Discovered date together, which makes the page hard to scan on a phone.

## 2. Background

The Discovered Lots page (`mrt-pallet-iq.web.app/discover...`) currently
renders an HTML table with 7 columns. On mobile this forces users to scroll
both vertically and horizontally to see all fields for a single lot, and the
Title column truncates in a way that hides the MSRP/Price/Discovered columns
entirely unless the user scrolls right.

A card layout puts every field for a lot in one vertically-stacked block, so
no horizontal scroll is required at any breakpoint.

## 3. Scope

**In scope:**

- New `LotCard` component rendering all fields for a single lot
- New `LotCardList` (or equivalent) container replacing the table on mobile
  breakpoints
- A computed `marginPct` field: `(msrp - price) / msrp * 100`
- Category and Condition rendered as pill badges (condition color-coded)
- Responsive breakpoint: cards on mobile, existing table preserved for
  desktop/tablet (≥ `md` breakpoint), OR cards everywhere if a single layout
  is preferred — **decision needed, see Open Questions**

**Out of scope:**

- Changes to the category filter dropdown
- Changes to data fetching / the lot discovery pipeline
- Sort or pagination behavior (unless already present and needs preserving)
- The List and Table alternate views prototyped separately — this spec covers
  the Card view only

## 4. Current State (reference)

Table columns observed in production: Title (link), Category, Condition,
Units, MSRP, Price, Discovered. Data source: existing `lots` query/prop
feeding the Discovered Lots page — locate and reuse, do not re-fetch.

## 5. Target Component

A working reference implementation exists at:
`discovered-lots-views.jsx` → `CardView` + supporting helpers
(`fmtMoney`, `marginPct`, `conditionStyle`, `marginStyle`). Use this as the
starting point, not as a drop-in — it uses static sample data and Tailwind
classes that need to be checked against this repo's existing Tailwind config
and design tokens before merging.

### Card contents (top to bottom)

1. Title (as a link to the existing lot detail destination)
2. Category badge + Condition badge (color-coded) + Lot # (small, muted)
3. Four-up stat row: Units / MSRP / Price / Margin %

## 6. File Changes

Adjust paths to match actual repo structure — confirm during Task 1.

- `src/components/lots/LotCard.tsx` — new
- `src/components/lots/LotCardList.tsx` — new (maps lots → LotCard)
- `src/pages/DiscoveredLots.tsx` (or equivalent) — swap table render for
  `LotCardList` at mobile breakpoint
- `src/lib/format.ts` (or wherever formatting helpers live) — add/reuse
  `formatMoney`, `computeMarginPct`
- `src/components/lots/LotCard.test.tsx` — new

## 7. Acceptance Criteria

- [ ] On a 375px-wide viewport, no element in the Discovered Lots page
      requires horizontal scrolling
- [ ] Every field currently shown in the table (Title, Category, Condition,
      Units, MSRP, Price, Discovered, Lot #) is visible per lot without a tap
      or expand action
- [ ] Condition badge color mapping: Returns = amber, Like New = emerald,
      New = sky (matches prototype; adjust to existing design tokens if the
      repo already defines a condition color scale)
- [ ] Margin % is computed correctly and matches `(msrp - price) / msrp`
      rounded to nearest integer
- [ ] Category filter dropdown continues to filter the rendered card list
      exactly as it filters the table today
- [ ] Existing lot detail link/navigation behavior is preserved
- [ ] No regression to desktop view (per decision in Open Questions)
- [ ] Component has test coverage for: margin calculation, condition badge
      mapping, empty state (zero lots)
- [ ] Lighthouse mobile score for the page does not regress

## 8. Open Questions (resolve before/during Task 1)

1. Cards on mobile only, or replace the table everywhere? Table view can be
   genuinely useful at desktop width for comparing many lots — recommend
   keeping table at `md:` and above, cards below.
2. Does the repo already have a Tailwind color scale for status/condition
   badges, or should this spec's amber/emerald/sky mapping be added as new
   tokens?
3. Is there an existing empty-state pattern (zero lots discovered) to match?
4. Should Margin % be a new field surfaced elsewhere (e.g. sortable in the
   category filter bar) in a future spec, or is display-only sufficient here?

## 9. Task Breakdown (for Claude Code CLI execution)

- **Task 1 — Discovery:** Locate the current Discovered Lots page component,
  its data source/props, existing Tailwind config, and any existing
  badge/pill components in the repo. Confirm file paths in Section 6 and
  answer Open Questions 1–3. Do not write code yet.
- **Task 2 — Formatting helpers:** Add/confirm `formatMoney` and
  `computeMarginPct` helpers with unit tests.
- **Task 3 — LotCard component:** Build `LotCard` per Section 5, using
  existing design tokens where available in place of the prototype's raw
  Tailwind classes.
- **Task 4 — LotCardList + integration:** Wire `LotCardList` into the
  Discovered Lots page at the agreed breakpoint, preserving the category
  filter and lot detail navigation.
- **Task 5 — Tests:** Cover acceptance criteria in Section 7.
- **Task 6 — Verification:** Manual check at 375px and 768px+ widths;
  confirm no horizontal scroll and no desktop regression.

## 10. Reference

Prototype component (all three view approaches, Card view is the target):
`discovered-lots-views.jsx` (provided separately, not part of this repo).

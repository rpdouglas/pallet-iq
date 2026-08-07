# Mobile & Responsive — Addendum

Extends [`Pallet-IQ-Design-System.md`](./Pallet-IQ-Design-System.md). Reuses that
doc's palette and type scale — no new values here.

## Why this exists

`docs/projects/PROJ-PALLETIQ.md` Phase 3 states the split explicitly: **mobile-first
for warehouse, desktop-first for buying decisions**. The base design system (sidebar
nav, stat-card dashboard) is a desktop pattern. This doc is what changes for the
warehouse persona's mobile surfaces (`docs/personas/warehouse.md`: mobile
scanning/receiving, bin locations, manifest-vs-received reconciliation).

## Breakpoints

Standard Tailwind scale — don't invent custom breakpoints:

| Name | Width  | Primary consumer                                   |
| ---- | ------ | -------------------------------------------------- |
| `sm` | 640px  | —                                                  |
| `md` | 768px  | Transition point: sidebar nav collapses below this |
| `lg` | 1024px | Buyer desktop dashboard target                     |
| `xl` | 1280px | Wide desktop (charts get more breathing room)      |

## Desktop-first (Buyer, Store Manager, Owner/Admin surfaces)

- Sidebar nav (Deep Navy → Ink Navy gradient, per base doc) is the primary
  navigation from `md` up.
- Below `md`, the sidebar collapses to a top app bar with a hamburger/drawer — this
  is a fallback for narrow windows, not the primary experience these personas use.
- Dashboard stat-card grid: 4-up at `xl`, 2-up at `md`–`lg`, 1-up below `md`.

## Mobile-first (Warehouse receiving/scanning surfaces)

- Primary nav is a **bottom tab bar** (not the sidebar) on receiving/scanning
  screens — thumb-reachable, matches native mobile scanning app conventions.
  Deep Navy background, Brand Blue active-tab indicator, consistent with the base
  doc's active-state treatment (Brand Blue pill / accent).
- **Touch targets ≥ 44×44px** for every interactive element on scanning screens
  (buttons, list rows, quantity steppers) — this is a hard floor, not a guideline,
  because these screens get used one-handed while holding a scanner or a box.
- Single-column layout only below `lg`; warehouse screens should rarely need `lg`+
  layouts at all given the persona is mobile-first by definition.
- Barcode/scan input gets a fixed, always-visible entry point (not buried in a
  menu) — typically a persistent scan button in the bottom tab bar or as a floating
  action button.
- Reconciliation flows (manifest-vs-received) use large, high-contrast
  quantity-delta indicators — reuse the existing green/red-with-arrow delta
  convention from the base doc, sized up for at-a-glance mobile reading.

## Density

Desktop surfaces can use the base doc's card padding/spacing as specified. Mobile
warehouse surfaces should increase touch-target padding and line height over the
desktop values — don't reuse desktop density on mobile scanning screens even where
the same component (e.g. a list row) appears in both contexts.

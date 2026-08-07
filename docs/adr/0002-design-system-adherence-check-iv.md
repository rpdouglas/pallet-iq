# ADR-0002: Design system adherence is a formal governance check (Check IV)

**Status:** Accepted
**Date:** 2026-08-07

## Context

The user provided `docs/design/Pallet-IQ-Design-System.md` as the canonical visual
identity for PalletIQ. A review against `docs/projects/PROJ-PALLETIQ.md`,
`docs/personas/*.md`, and `docs/GOVERNANCE.md` found two concrete spec defects
(a WCAG contrast failure in the Slate Gray text color, and an unlicensed webfont
listed as an alternative) and several structural gaps against requirements the
product spec already states explicitly: no mobile/responsive spec despite Phase 3's
mandated mobile-first warehouse vs. desktop-first buyer split, no visual pattern for
hiding role-denied fields despite governance Check III requiring it, and no
component spec at all for the explainable-scoring factor breakdown that
`PROJ-PALLETIQ.md` names as the product's #1 competitive advantage.

`docs/GOVERNANCE.md` already establishes three standing checks (rules parity, async
AI boundary, RBAC parity) that apply across every phase and are verified on every
PR via the `pre-pr-check` skill and dedicated auditor subagents. Nothing equivalent
existed for the design system — it was a document, not an enforced constraint,
which is exactly the gap that let the two defects above ship in the first version
without being caught.

## Decision

Design system adherence becomes **governance Check IV**, holding UI code to the
same standing-check treatment as Checks I–III: no unapproved hardcoded
colors/fonts in `src/`, denied-role fields omitted from the DOM rather than
CSS-hidden (per `docs/design/rbac-ui-patterns.md`), and new UI components checked
against the documented patterns in `docs/design/components.md` before inventing new
ones. A new `design-system-auditor` subagent performs this check, dispatched from
the `pre-pr-check` skill whenever a diff touches `src/` components, pages, or
styles — mirroring how `firestore-rules-auditor` already handles Check I.

Four addendum docs were written alongside this decision to close the structural
gaps found in review: `docs/design/mobile-responsive.md`,
`docs/design/rbac-ui-patterns.md`, `docs/design/explainable-scoring.md`, and
`docs/design/components.md`. All reuse the existing palette and type scale — no new
design values were introduced while closing these gaps.

## Alternatives considered

- **Fold a design-token check into `pre-pr-check` only, no formal "Check" or
  subagent.** Lower overhead, but inconsistent with how Checks I–III are already
  treated as first-class, named, auditor-backed governance items — would leave the
  design system as a second-class constraint despite it now covering a real product
  requirement (Check III's UI-side enforcement depends on the RBAC-hidden-field
  pattern this doc defines). Rejected — offered to the user and declined in favor of
  full Check IV treatment.
- **Reference-only: a CLAUDE.md pointer, no automated check.** Cheapest option, but
  relies entirely on remembering to check manually — exactly the failure mode that
  let the contrast/font defects ship in v1 of the doc. Rejected for the same reason.
- **Leave the two spec defects (contrast failure, SF Pro licensing) as-is, fix
  later.** Rejected — both are concrete, quantifiable, and cheap to fix now
  (one hex value, one line); deferring them would mean shipping known-broken
  guidance into the first round of UI implementation.

## Consequences

- Every PR touching `src/` UI code now clears a 4th gate (Check IV) in
  `pre-pr-check`, alongside I–III. This is enforced by an LLM-judgment auditor
  (`design-system-auditor`, not a unit-test pair like Check I) — appropriate given
  visual/pattern adherence is inherently more subjective than Firestore rule
  denial, but it also means Check IV findings are advisory-strength, not
  binary-pass like a rules test.
- The addendum docs need upkeep as new component types appear (e.g. a modal/dialog
  pattern isn't covered yet) — `docs/design/components.md` should grow
  incrementally as real components get built, not be treated as complete now.
- `PALLETIQ-016` (Tailwind v4 token wiring, font loading, icon library dependency)
  is the follow-up ticket that turns this doc into enforceable code — until it
  ships, Check IV can flag drift (e.g. `src/App.tsx`'s current use of default
  Tailwind slate colors instead of brand tokens) but there's no token system yet
  for compliant code to use instead.

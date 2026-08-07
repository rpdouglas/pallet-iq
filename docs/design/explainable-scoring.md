# Explainable Scoring — Addendum

Extends [`Pallet-IQ-Design-System.md`](./Pallet-IQ-Design-System.md). Reuses that
doc's palette and type scale — no new values here.

## Why this exists

`docs/projects/PROJ-PALLETIQ.md` lists "Explainable scoring — factor-level
transparency as a first-class UX requirement, not an afterthought" as competitive
advantage #1, and Phase 2's QA verification requires "Pallet score factor breakdown
renders correctly for a sample pallet." The base design system has cards, charts,
and buttons specified, but nothing for the one component this product's core value
proposition actually depends on. This is deliberately scoped as a pattern, not a
pixel-perfect mock — refine against a real sample pallet once Phase 2 implementation
starts.

## Score badge

The headline number (e.g. a 0–100 buy-confidence score, or a Buy/Bid/Negotiate/Pass
recommendation) uses the base doc's "Metric" type treatment (28–32px, Bold, Ink
Navy) inside a stat-tile-style card (white/Cloud Gray background, ~12px radius,
subtle shadow — per base doc §4). The badge is never presented alone without a way
to reach the factor breakdown below it — no black-box numbers, per the product's own
stated principle.

## Factor breakdown

Below or beside the score badge, an expandable list of the factors that produced it:

- Each factor is a row: **label** (Body text, Ink Navy) + **contribution indicator**
  - optional **short explanation** (Label/Caption size, Slate Gray).
- **Contribution indicator** reuses the existing green/red-with-arrow delta
  convention from the base doc (§2 usage guidelines: always icon + color, never
  color alone) for factors that push the score up or down (e.g. "↑ Strong sell-through
  history" in green, "↓ High vendor return rate" in red).
- Factors with no directional pull (informational only — e.g. "Category: Electronics")
  use Slate Gray text with a neutral icon (Lucide's `minus` or `info`), not
  green/red, so a user can't misread a neutral fact as a positive or negative signal.
- Rows are sorted by magnitude of contribution, largest first, so the most decision-
  relevant factors are visible without scrolling/expanding further.

## Data provenance

Where a factor is sourced from anonymized cross-tenant data (`product_intelligence`
— PalletIQ's other core moat, per the base doc's competitive-advantage framing),
label it as such in the Caption-size Slate Gray subtext (e.g. "Based on 340 similar
sales across the network"). This is a trust signal, not decoration — don't omit it
to save space.

## States

- **Loading:** skeleton rows in the factor list (see [`components.md`](./components.md)
  loading convention) while the async Gemini scoring result is pending — per
  governance Check II, this is never computed inline on the request path, so a
  loading state here is expected and should look intentional, not like a stall.
- **No score yet:** an empty state (per [`components.md`](./components.md)), not a
  zero score — a pallet that hasn't been scored yet is a different state from one
  scored as low-confidence.

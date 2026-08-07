# RBAC UI Patterns — Addendum

Extends [`Pallet-IQ-Design-System.md`](./Pallet-IQ-Design-System.md). Reuses that
doc's palette and type scale — no new values here.

## Why this exists

`docs/GOVERNANCE.md` Check III: "A permission boundary enforced only in Firestore
rules and not reflected in the UI (or vice versa) is incomplete." The most concrete
instance today is `docs/personas/warehouse.md`: warehouse-role users must not see
purchase cost fields — a hard Phase 3 QA requirement ("a warehouse-role user cannot
view purchase cost fields via the UI or a direct Firestore query"). The base design
system has no visual pattern for this at all.

## The rule: omit, don't hide

**A field, row, or column a role cannot see is not rendered in the DOM.** Not
`display: none`, not `visibility: hidden`, not a CSS class that visually hides it —
those still ship the data to the client, where it's trivially visible via dev tools
or the page source. If the underlying query legitimately can't be scoped to exclude
the field (e.g. a shared component fetches a full document), the component must
strip the field from its own render output before anything paints, not rely on CSS.

This mirrors the `firestore.rules` posture already in place: denial happens at the
source, not as a cosmetic layer on top.

## Worked example: Warehouse viewing inventory

A Buyer or Owner/Admin viewing an inventory table sees a "Cost" column (Ink Navy
value text, Slate Gray header label, per the base doc's table conventions once
[`components.md`](./components.md) tables are in use). For a Warehouse-role user,
that column does not exist in the rendered table — the table has one fewer column,
not a blanked-out one. Same logic applies to:

- Vendor pricing/terms fields (Warehouse has no access to vendor pricing)
- `settings`, `subscriptions`, `api_keys`, `audit_logs` — entire pages/routes are
  unreachable for roles without access, not visible-but-disabled nav items with a
  lock icon (a disabled-but-visible nav item still discloses that the feature
  exists, which is fine for e.g. "upgrade to unlock" upsell patterns but wrong for
  a hard permission boundary like billing/audit data)

## Distinguishing "denied" from "not yet loaded" or "empty"

Don't reuse the empty-state pattern ([`components.md`](./components.md)) for a
denied field — an empty state says "there's nothing here yet," which is a different
message than "you don't have access to this." A denied field is simply absent, with
no placeholder communicating its absence to that role — the surrounding layout
reflows around it (see the worked example above: one fewer column, not an empty
one).

## Verification

This pattern is what `firestore-rules-auditor`-style verification (Check III, once
a dedicated `rbac-parity-auditor` subagent exists) and manual QA both check against:
grep rendered output / DOM for a denied field's value when authenticated as the
denied role. If it's present anywhere in the response — even CSS-hidden — that's a
Check III failure, not just a Check IV (design-system) style nit.

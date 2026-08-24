# ADR-0016: App versioning uses ticket-driven SemVer, tagged at ticket-close

**Status:** Proposed
**Date:** 2026-08-24

## Context

Neither `package.json` (frontend, `"version": "0.0.0"`) nor
`functions/package.json` (`"version": "1.0.0"`) reflects a real versioning
scheme — both are still at scaffold placeholders. There's currently no way
to answer "what shipped in this deploy" or "which git state corresponds to
version X" other than reading commit history directly.

PalletIQ's governance model (`docs/GOVERNANCE.md`) already tracks work at
two granularities that a version number could hook into: individual
tickets (`PALLETIQ-NNN`, closed via the `close-ticket` skill) and phases
(`docs/ROADMAP.md`, Phase 0–4). The app is pre-launch, single-deployment
(frontend and Cloud Functions deploy together, not independently), and has
no external API consumers yet — so there's no third party depending on
SemVer's compatibility guarantees today. The main problem this needs to
solve is traceability (which tag/version corresponds to which shipped
tickets), not compatibility signaling.

## Decision

Adopt **SemVer (`MAJOR.MINOR.PATCH`)** for the app as a whole, with
frontend and `functions/` versions kept in lockstep (same version, bumped
together) since they deploy together. Bump rules:

- **`PATCH`** — a routine ticket close (bug fix, small feature, docs/rules
  change scoped to one `PALLETIQ-NNN`).
- **`MINOR`** — a phase's planned feature set ships (e.g. all of Phase 1's
  tickets close per `docs/ROADMAP.md`).
- **`MAJOR`** — reserved for post-launch breaking changes to a contract a
  real external consumer depends on (public API, data export format).
  Not expected to fire pre-launch.

The version bump and `git tag vX.Y.Z` on the release commit happen as a
step in the `close-ticket` skill, so every ticket close produces a
traceable version bump tied to the ticket ID in the tag/commit history —
no separate release process to remember.

## Alternatives considered

- **Date-based versioning (e.g. `2026.08.24`).** Gives the same
  traceability with less ceremony, and sidesteps the awkwardness of
  SemVer's "breaking change" semantics not mapping cleanly onto an
  internal tool with no external API consumers pre-launch. Rejected for
  now because SemVer's `MINOR` bump gives phase completion a visible
  signal that a flat date scheme doesn't, and the cost of maintaining
  SemVer here is low (one line in `close-ticket`); can revisit if that
  turns out not to pull its weight.
- **No versioning until post-launch.** Cheapest option, but the traceability
  gap it leaves (which commit/tag shipped which tickets) already exists
  today and is exactly what prompted this ADR — deferring doesn't remove
  the need, it just delays paying for it. Rejected.
- **Independent frontend/functions versioning.** Matches how some
  monorepos version each deployable separately, but frontend and functions
  currently deploy together as one unit with no independent release
  cadence — separate version numbers would track a distinction that
  doesn't exist yet. Rejected until the two are actually deployed
  independently, at which point this ADR should be revisited.

## Consequences

- `close-ticket` needs a new step: bump `version` in both `package.json`
  and `functions/package.json` together, and tag the release commit
  (`git tag vX.Y.Z`) — adds a small, mechanical step to every ticket close.
- Whoever closes a ticket has to judge whether it's a `PATCH` or `MINOR`
  bump (i.e., does it complete a phase per `docs/ROADMAP.md`) — a small
  amount of manual judgment, not automated from ticket metadata.
- Pre-launch, `MAJOR` will likely stay at `0` for a long time (or the app
  stays under `0.x.y`, `MINOR` doubling as the meaningful bump) — the
  SemVer `MAJOR` slot is effectively unused until there's a real external
  consumer to break, which is expected and fine.
- Version tags give `docs/ACTIVE_CYCLE.md` drift notes and future
  incident/rollback discussions a concrete git reference to point at,
  instead of only commit SHAs or ticket IDs.

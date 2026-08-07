---
name: new-adr
description: Scaffold a new Architecture Decision Record from docs/adr/template.md with the next sequential ADR number. Use when a decision is architecturally significant per the Planning gate in docs/GOVERNANCE.md, or when asked to write/create/draft an ADR.
---

# New ADR

Scaffolds a new ADR in `docs/adr/` following this repo's convention (see
`docs/adr/0001-multi-tenant-from-phase-0.md` for a worked example and
`docs/adr/template.md` for the blank structure).

## Steps

1. **Find the next number.** List `docs/adr/*.md` (excluding `template.md`), find the
   highest `NNNN` prefix, increment it, zero-padded to 4 digits (e.g. `0001` → `0002`).

2. **Get the decision content from the user/conversation.** An ADR needs, at minimum,
   a clear statement of: what situation prompted this decision, what was decided,
   what alternatives were considered and why they were rejected, and what the
   consequences are (costs as well as benefits). If any of this isn't already clear
   from the conversation, ask rather than inventing plausible-sounding filler —
   a thin or fabricated ADR is worse than none.

3. **Write the file** at `docs/adr/NNNN-kebab-case-title.md` using the exact section
   structure from `docs/adr/template.md`:
   ```
   # ADR-NNNN: Title

   **Status:** Proposed
   **Date:** <today, YYYY-MM-DD>

   ## Context

   ## Decision

   ## Alternatives considered

   ## Consequences
   ```
   `Status` starts as `Proposed` unless the user says it's already decided/accepted.

4. **Report back** the file path and ADR number. If this was invoked from within
   `open-ticket`, that skill links the ADR from the ticket's backlog entry. Per the
   Planning gate, the ADR must exist before implementation starts — don't let
   implementation proceed until this file is written.

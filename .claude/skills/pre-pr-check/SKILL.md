---
name: pre-pr-check
description: Run PalletIQ's pre-PR governance gate - the CONTRIBUTING.md command checklist plus governance Checks I/II/III/IV (rules parity, async AI boundary, RBAC UI/rules parity, design system adherence). Use before opening a PR, before marking a ticket done, or when asked to verify a change is ready to ship.
---

# Pre-PR check

Runs the full gate a change needs to clear before a PR or ticket close, per
`CONTRIBUTING.md` and `docs/GOVERNANCE.md`.

## Steps

1. **Confirm this isn't `main`.** Run `git rev-parse --abbrev-ref HEAD`. If it's
   `main`/`master`, stop — per `CONTRIBUTING.md`, changes land via PR from a feature
   branch, not by checking things off directly on `main`. Don't proceed with the rest
   of this checklist until the work is on a feature branch (a session hook also
   blocks the actual commit/push, but this skill shouldn't even get that far).

2. **Scope the diff.** Run `git status` and `git diff` against the `main` base to see
   what changed. This determines which conditional checks below apply.

3. **Command checklist** — run in order, stop and report on first failure rather than
   continuing past a broken step:

   ```
   npm run format:check
   npm run lint
   npm run typecheck
   npm run test
   ```

   Then `npm run test:rules` **if** `firestore.rules`, `firestore.rules.test.ts`, or
   any file under a tenant-scoped collection's code path changed.

4. **Check I — Rules parity.** If `firestore.rules`, `firestore.rules.test.ts`, or any
   code introducing/using a new Firestore collection changed, dispatch to the
   `firestore-rules-auditor` subagent and include its findings verbatim. If nothing
   Firestore-related changed, skip with a one-line note.

5. **Check II — Async AI boundary.** Grep `src/` (and `functions/` if present) for
   Gemini/Vertex SDK usage (`@google/generative-ai`, `vertexai`, `GoogleGenerativeAI`,
   etc.). If none exists, report `N/A — no AI SDK calls in codebase yet (pre
PALLETIQ-005)`. If calls exist, manually verify each call site is inside a queue
   worker / Cloud Function triggered by Cloud Tasks or Pub-Sub, not inline in a
   user-facing request handler or React component — report any inline call as a
   violation.

6. **Check III — RBAC in UI and rules.** Grep `src/` for role-gating (checks against
   `role`, `tenantId` claims, or the `Role` type from `src/types/auth.ts`) in
   components/hooks. If none exists, report `N/A — no role-gated UI yet (pre
PALLETIQ-002/006)`. If it exists, cross-check each UI role boundary against the
   corresponding restriction in `firestore.rules` and `docs/personas/*.md` — flag any
   boundary enforced in only one layer.

7. **Check IV — Design system adherence.** If the diff touches any file under `src/`
   (components, pages, styles), `public/` (favicon, icons, logo assets), or
   `index.html`, dispatch to the `design-system-auditor` subagent — **`design-system-auditor`
   has no `Bash` tool by design (read-only auditor), so it cannot run `git diff`
   itself.** Pass it the exact list of changed files from step 2 directly in the
   dispatch prompt (e.g. "audit these changed files: index.html, src/App.tsx" — not
   "audit the current diff"), and include its findings verbatim in this report. A
   mismatched favicon or page title is as much a Check IV violation as a wrong color
   in a component, so don't scope this to `src/` alone. If none of those changed
   (e.g. a docs-only or governance-only PR), report `N/A — no UI code or brand
assets changed`.

8. **Report.** Print one compact pass/fail table: the 4-5 npm commands, then Check
   I/II/III/IV each as PASS / FAIL / N/A with a one-line reason. If anything failed,
   stop here — don't suggest the change is ready.

9. **Offer to push and open the PR.** If everything passed or was legitimately N/A,
   confirm with the user before pushing (`git push -u origin <branch>`) and opening a
   PR (`gh pr create`) — these are visible-to-others actions, so don't do them
   silently even though the checks passed. If the user declines or this is being run
   mid-work rather than at the end, just report that the change is clear to ship
   whenever they're ready.

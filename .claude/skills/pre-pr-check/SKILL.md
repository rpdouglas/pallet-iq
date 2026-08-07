---
name: pre-pr-check
description: Run PalletIQ's pre-PR governance gate - the CONTRIBUTING.md command checklist plus governance Checks I/II/III (rules parity, async AI boundary, RBAC UI/rules parity). Use before opening a PR, before marking a ticket done, or when asked to verify a change is ready to ship.
---

# Pre-PR check

Runs the full gate a change needs to clear before a PR or ticket close, per
`CONTRIBUTING.md` and `docs/GOVERNANCE.md`.

## Steps

1. **Scope the diff.** Run `git status` and `git diff` (or diff against the PR's base
   branch if known) to see what changed. This determines which conditional checks
   below apply.

2. **Command checklist** — run in order, stop and report on first failure rather than
   continuing past a broken step:
   ```
   npm run format:check
   npm run lint
   npm run typecheck
   npm run test
   ```
   Then `npm run test:rules` **if** `firestore.rules`, `firestore.rules.test.ts`, or
   any file under a tenant-scoped collection's code path changed.

3. **Check I — Rules parity.** If `firestore.rules`, `firestore.rules.test.ts`, or any
   code introducing/using a new Firestore collection changed, dispatch to the
   `firestore-rules-auditor` subagent and include its findings verbatim. If nothing
   Firestore-related changed, skip with a one-line note.

4. **Check II — Async AI boundary.** Grep `src/` (and `functions/` if present) for
   Gemini/Vertex SDK usage (`@google/generative-ai`, `vertexai`, `GoogleGenerativeAI`,
   etc.). If none exists, report `N/A — no AI SDK calls in codebase yet (pre
   PALLETIQ-005)`. If calls exist, manually verify each call site is inside a queue
   worker / Cloud Function triggered by Cloud Tasks or Pub-Sub, not inline in a
   user-facing request handler or React component — report any inline call as a
   violation.

5. **Check III — RBAC in UI and rules.** Grep `src/` for role-gating (checks against
   `role`, `tenantId` claims, or the `Role` type from `src/types/auth.ts`) in
   components/hooks. If none exists, report `N/A — no role-gated UI yet (pre
   PALLETIQ-002/006)`. If it exists, cross-check each UI role boundary against the
   corresponding restriction in `firestore.rules` and `docs/personas/*.md` — flag any
   boundary enforced in only one layer.

6. **Report.** Print one compact pass/fail table: the 4-5 npm commands, then Check
   I/II/III each as PASS / FAIL / N/A with a one-line reason. If anything failed,
   stop here — don't suggest the change is ready. If everything passed or was
   legitimately N/A, state that the change is clear to open as a PR / close as a
   ticket.

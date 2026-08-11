# Contributing

## Workflow

PalletIQ follows the 3-phase gate governance model documented in
[`docs/GOVERNANCE.md`](./docs/GOVERNANCE.md): planning → autonomous
execution → ticket close with drift detection. Read that before starting
nontrivial work — it covers what "done" means for a ticket, including the
rules-parity requirement (no Firestore collection ships without security
rules and a passing/failing rules test).

## Branching

**`main` only accepts changes via PR — never commit or push to `main`
directly**, including for docs-only changes like backlog/roadmap updates.

- Branch off `main` before making any change: `git checkout -b
palletiq-NNN-short-slug` (ticket ID first if the change is ticket-scoped,
  otherwise a short descriptive slug).
- Commit in logical, reviewable units — one commit per coherent change, not
  one giant commit per ticket and not one commit per file save. Commit
  messages explain _why_, per the Commit style section below.
- Open a PR into `main` once `pre-pr-check` passes (see
  [`.claude/skills/pre-pr-check`](./.claude/skills/pre-pr-check/SKILL.md)).
  Self-merge is fine once CI is green — branch protection does not require a
  second approver on this repo — but the PR (and its passing checks) is
  required.

A Claude Code hook (`.claude/hooks/git-branch-guard.py`, wired in
`.claude/settings.json`) blocks `git commit`/`git push` aimed at `main` or
`master` from inside a Claude Code session, as a guardrail against this
happening by accident. It's a workflow nudge, not a substitute for the
GitHub-side branch protection below — that's the actual enforcement.

## Before opening a PR

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:rules   # if firestore.rules or any tenant-scoped collection changed
npm run test:storage-rules   # if storage.rules or any tenant-scoped storage path changed
```

All of the above run in CI (`.github/workflows/ci.yml`) and must pass
before merge.

## Third-party secrets

Any new third-party credential (API key, webhook signing secret, etc.) goes
through `firebase-functions/params`' `defineSecret` (or `defineString` for
non-secret config), backed by Secret Manager — never a plaintext
`functions/.env*` file or committed config. `functions/src/billing/params.ts`
is the worked example (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`); see
[`ADR-0005`](./docs/adr/0005-stripe-billing-mechanism.md) for the reasoning.

Provision the real value only once a concrete consumer needs it
(`firebase functions:secrets:set SECRET_NAME`) — don't provision a secret
speculatively ahead of the code that reads it. The Secret Manager API is
already enabled on `mrt-pallet-iq`, so there's no fresh GCP setup required
the next time this comes up.

## Branch protection (repo settings — apply manually)

Not yet configured on this repo. This needs a GitHub admin token with
`administration:write` on the repo, which the Codespaces default token does
not have — apply it once, by hand, via **Settings → Branches → Add branch
protection rule** for `main` (or `gh api
repos/rpdouglas/pallet-iq/branches/main/protection -X PUT ...` from a shell
with a suitably-scoped personal access token):

- Require a pull request before merging (no direct pushes)
- Do **not** require approvals (`required_approving_review_count: 0`) — this
  is currently a small/solo team, so self-merge after CI passes is fine;
  revisit once there's a second reviewer
- Require status checks to pass before merging:
  - `Lint, typecheck, unit tests`
  - `Firestore rules tests`
- Require branches to be up to date before merging
- Do not allow force pushes or branch deletion on `main`

Until this is applied, the only thing preventing a direct push to `main` is
the Claude Code hook described above (session-local) and personal
discipline — it is not yet enforced repo-wide.

## Commit style

Clear, descriptive commit messages focused on _why_ a change was made, not
just _what_ changed. Reference the ticket ID (`PALLETIQ-NNN`) from
[`docs/BACKLOG.md`](./docs/BACKLOG.md) where applicable.

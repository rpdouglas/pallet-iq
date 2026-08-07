# Contributing

## Workflow

PalletIQ follows the 3-phase gate governance model documented in
[`docs/GOVERNANCE.md`](./docs/GOVERNANCE.md): planning → autonomous
execution → ticket close with drift detection. Read that before starting
nontrivial work — it covers what "done" means for a ticket, including the
rules-parity requirement (no Firestore collection ships without security
rules and a passing/failing rules test).

## Before opening a PR

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:rules   # if firestore.rules or any tenant-scoped collection changed
```

All of the above run in CI (`.github/workflows/ci.yml`) and must pass
before merge.

## Branch protection (recommended repo settings)

Not yet configured on this repo — apply once the first PR is ready to
land. Recommended settings for `main`:

- Require a pull request before merging (no direct pushes)
- Require status checks to pass before merging:
  - `Lint, typecheck, unit tests`
  - `Firestore rules tests`
- Require branches to be up to date before merging
- Do not allow force pushes or branch deletion on `main`

## Commit style

Clear, descriptive commit messages focused on _why_ a change was made, not
just _what_ changed. Reference the ticket ID (`PALLETIQ-NNN`) from
[`docs/BACKLOG.md`](./docs/BACKLOG.md) where applicable.

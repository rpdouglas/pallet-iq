# Security Policy

PalletIQ is pre-release (Phase 0 — see [`docs/ROADMAP.md`](./docs/ROADMAP.md)),
handling no real customer data yet. Even so, if you find a security issue,
please report it responsibly rather than opening a public issue.

## Reporting a vulnerability

Preferred: use GitHub's private vulnerability reporting for this repo
([Security → Report a vulnerability](../../security/advisories/new)). This
keeps the report private until a fix is ready.

If that's unavailable, open a GitHub issue with minimal detail asking for a
private contact channel, and a maintainer (see [`CODEOWNERS`](./CODEOWNERS))
will follow up.

Please don't include real credentials, tenant data, or exploit payloads in a
public issue or PR.

## Scope

Relevant areas given the current architecture (see
[`docs/projects/PROJ-PALLETIQ.md`](./docs/projects/PROJ-PALLETIQ.md)):
tenant-isolation bypass in `firestore.rules`/`storage.rules`, authentication/
authorization flaws, and secret exposure. Dependency vulnerabilities are
tracked separately via Dependabot ([`.github/dependabot.yml`](./.github/dependabot.yml))
rather than through this process, unless one is actually exploitable in this
app's usage.

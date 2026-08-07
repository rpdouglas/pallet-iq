# PalletIQ

Give liquidation buyers the same analytical tools large retailers use to
evaluate inventory — answering "Should I buy this pallet?" with an
explainable, data-backed recommendation before money changes hands.

PalletIQ ingests manifests from multiple liquidation vendors, normalizes
them into one schema, enriches them with AI and historical outcome data,
and produces a transparent buy/bid/negotiate/pass recommendation with
projected ROI. It is designed from the outset as a multi-tenant SaaS
product, not a single-user tool retrofitted later.

Full scope and rationale: [`docs/projects/PROJ-PALLETIQ.md`](./docs/projects/PROJ-PALLETIQ.md).
Current phase status: [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Status

⚪ Planned — Phase 0 (Foundation Prerequisites). This repo currently
contains scaffolding only: governance docs, app skeleton, Firestore rules
stubs, and CI. No product features are implemented yet. See
[`docs/BACKLOG.md`](./docs/BACKLOG.md) for the first tickets.

## Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query,
React Router v7, React Hook Form, Zod

**Backend:** Firebase Authentication (custom claims: `tenantId` + `role`),
Firestore, Cloud Functions, Cloud Storage, Firebase Hosting, Cloud
Scheduler, Secret Manager, Stripe

**AI:** Gemini API (async/batched), Vertex AI (future), embeddings for
semantic product matching

## Local development (GitHub Codespaces)

This repo is configured for Codespaces via `.devcontainer/devcontainer.json`
(Node LTS + Firebase CLI preinstalled).

1. Open the repo in a Codespace (or clone it and open in a devcontainer
   locally).
2. Dependencies install automatically on container create. If needed:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your Firebase project's web
   config:
   ```bash
   cp .env.example .env
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

### Useful scripts

| Command                           | Purpose                                                |
| --------------------------------- | ------------------------------------------------------ |
| `npm run dev`                     | Vite dev server                                        |
| `npm run build`                   | Typecheck + production build                           |
| `npm run lint`                    | ESLint                                                 |
| `npm run format` / `format:check` | Prettier                                               |
| `npm run typecheck`               | `tsc --noEmit`                                         |
| `npm run test`                    | Unit tests (Vitest)                                    |
| `npm run test:rules`              | Firestore security rules tests (spins up the emulator) |

### Firebase emulators

```bash
npx firebase emulators:start
```

Runs Auth, Firestore, and Hosting emulators locally per `firebase.json`.

## Governance

This repo follows docs-as-code governance — see
[`docs/GOVERNANCE.md`](./docs/GOVERNANCE.md) for the planning →
autonomous execution → ticket close (with drift detection) workflow, and
[`docs/adr/`](./docs/adr/) for architectural decisions.

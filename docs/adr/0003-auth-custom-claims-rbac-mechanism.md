# ADR-0003: How Firebase Auth custom claims (tenantId, role) get set

**Status:** Proposed
**Date:** 2026-08-08

## Context

`PALLETIQ-002` needs a way to assign every user a `tenantId` + `role` — the
Firebase Auth custom claims that `firestore.rules` and `storage.rules`
already gate every tenant-scoped read/write on (`hasRole`/`isOwnerOrManager`/
`isOwner`, `isTenantMember`). Custom claims can only be set server-side via
the Admin SDK — never client-writable — so this is fundamentally about what
trusted server-side code sets them, when, and under what validation.

Two distinct paths need to produce claims: **tenant bootstrap** (the first
user of a brand-new tenant becomes `owner` — there's no existing owner to
invite them) and **invite** (an existing Owner assigns `tenantId` + a role to
a new or existing user — per `docs/personas/owner-admin.md`, Owner is "the
only role permitted to remove or demote other tenant members," and RBAC
administration is Owner-only). Getting the invite path wrong is a real
privilege-escalation risk, not just a plumbing bug — a client that can
influence its own `tenantId`/`role` claim, or redeem another user's invite,
defeats every tenant-isolation guarantee the rest of the app assumes.

A related, concrete finding while investigating: `firestore.rules`'s
`users/{userId}` block currently allows `allow create: if isSignedIn() &&
request.auth.uid == userId` and a similarly permissive `allow update` — a
signed-in client can create/update their **own** `users/{uid}` mirror doc
with **any** `tenantId`/`role` fields it likes, client-side, today. This
doesn't grant real Firestore access (rules elsewhere check
`request.auth.token.tenantId`/`role` — the actual signed claims — not
`resource.data` on this doc), but it does mean the mirror doc can lie about a
user's role to anything that reads it for display without cross-checking the
real claim. This ADR's decision needs to close that gap, not just design the
happy path.

## Decision

**Firebase Functions v2 HTTPS Callables** (`onCall`, Admin SDK), not Firestore
triggers or Auth blocking functions. Four callables, all in `functions/src/`:

- **`createTenant({ tenantName })`** — bootstrap path. Creates the tenant,
  unconditionally sets the caller's own claims to `{ tenantId, role: 'owner'
}` (never client-specifiable), writes their `users/{uid}` mirror doc.
- **`inviteMember({ email, role })`** — Owner-only (verified server-side via
  `request.auth.token.role === 'owner'`, using the caller's _own_ signed
  claims, not client input). Creates `tenants/{tenantId}/invites/{inviteId}`
  with a cryptographically random token, the target email, the requested
  role, `status: 'pending'`, and an expiry.
- **`acceptInvite({ inviteId, token })`** — called by the invited user after
  they've authenticated. Looks up the invite server-side; validates the
  token, that it's unexpired and `pending`, and that
  `request.auth.token.email` (Firebase-verified) matches `invite.email` —
  this last check stops a different authenticated user from redeeming
  someone else's invite even if they somehow obtained the token. On success,
  sets the caller's claims from the **server-side invite record**
  (`invite.tenantId`, `invite.role`), never from client-supplied values, and
  marks the invite consumed.
- **`updateMemberRole({ uid, role })`** — Owner-only, same caller-claim check
  as `inviteMember`. Covers role changes and removal (`role: null` revokes
  tenant access) — one code path for all post-bootstrap role administration
  rather than a separate removal mechanism, per `docs/personas/owner-admin.md`'s
  "only role permitted to remove or demote."

**`firestore.rules`'s `users/{userId}` block gets tightened as part of this
same ticket**: `tenantId` and `role` become immutable from the client (only
the trusted callables, via the Admin SDK, can set them — Admin SDK writes
bypass rules entirely, so this doesn't block the callables). Other profile
fields (`displayName`, etc.) stay self-editable. This closes the gap
described in Context; it's not optional cleanup.

**Client-side consequence to design for:** custom claims don't appear on the
client's ID token until it's refreshed. The RBAC hook (also in `PALLETIQ-002`'s
scope) must force `getIdTokenResult(true)` immediately after `createTenant`/
`acceptInvite` resolves, before routing into tenant-scoped UI — otherwise
`firestore.rules` checks relying on the token still see no `tenantId`/`role`
and every read fails, even though the claim was set correctly server-side.

## Alternatives considered

- **Firestore `onCreate` trigger on `users/{userId}`**: client creates its
  own profile doc first, a trigger reacts and sets real claims. Rejected —
  async (client can't know synchronously whether it succeeded, which matters
  for onboarding UX in `PALLETIQ-006`), and doesn't naturally express "an
  invite must be created by an Owner and redeemed by a different, specific
  user" as cleanly as an explicit request/response callable pair.
- **Auth blocking functions** (`beforeUserCreated`): auto-assign claims at
  account-creation time by checking for a pending invite matching the new
  user's email. Rejected for now — doesn't cleanly capture the tenant-bootstrap
  path (there's no tenant name or "create a new tenant" intent available at
  the raw auth-creation-event point without a circular dependency on claims
  that don't exist yet), and constrains future flexibility (e.g. a user
  signing up before being invited, then later accepting an invite) more than
  explicit callables do.
- **Leave `users/{userId}` rules as-is, rely on claims-only enforcement**:
  technically doesn't grant unauthorized Firestore access. Rejected — a
  mirror doc that can lie about its own subject's role is a data-integrity
  problem waiting to surface (e.g. a future feature that trusts
  `resource.data.role` for a quick display check instead of the real claim),
  and the fix is cheap.

## Consequences

- Four new Cloud Functions to build, test, and eventually secure-review
  (`createTenant`, `inviteMember`, `acceptInvite`, `updateMemberRole`) —
  more surface area than a single trigger, but each has a narrow, auditable
  responsibility and none of them trust client-supplied role/tenant data for
  the actual claim assignment.
- `firestore.rules`'s `users/{userId}` block requires a real rule change
  (field-level immutability for `tenantId`/`role` on client writes), which
  needs its own `firestore.rules.test.ts` coverage — folds into the existing
  `PALLETIQ-001` rules-test-coverage work, or ships alongside `PALLETIQ-002`
  directly; decide at implementation time which ticket carries it.
- Invite documents (`tenants/{tenantId}/invites/{inviteId}`) are a new
  sub-collection needing its own tenant-isolation rules + Check I test pair —
  not yet designed in this ADR; implementation must add it, not assume the
  existing `tenants/{tenantId}` wildcard coverage is sufficient without
  checking.
- The forced ID-token-refresh requirement is easy to forget when
  `PALLETIQ-006`'s onboarding UI gets built — worth a code comment at the
  callable call sites, not just this ADR, so it doesn't get silently dropped.

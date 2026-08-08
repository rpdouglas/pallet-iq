import type { Timestamp } from 'firebase-admin/firestore'

// Mirrors src/types/auth.ts's Role type. Per CLAUDE.md, this type, the role
// helpers in firestore.rules, and docs/personas/*.md are one contract - keep
// them in sync.
export type Role = 'owner' | 'manager' | 'warehouse' | 'buyer'

export const ROLES: readonly Role[] = ['owner', 'manager', 'warehouse', 'buyer']

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

// tenants/{tenantId}/settings/general
export interface TenantSettingsDoc {
  name: string
  createdAt: Timestamp
  createdBy: string
}

// users/{uid} - mirrors the tenantId/role custom claims for query
// convenience. Written exclusively by these Cloud Functions via the Admin
// SDK - see ADR-0003 and the comment on the users/{userId} rule block.
export interface UserDoc {
  tenantId: string
  role: Role
  email: string
  displayName?: string
  createdAt: Timestamp
  removedAt?: Timestamp
}

// tenants/{tenantId}/invites/{inviteId} - Cloud-Functions-only, see
// firestore.rules.
export interface InviteDoc {
  email: string
  role: Role
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  invitedBy: string
  token: string
  createdAt: Timestamp
  expiresAt: Timestamp
  acceptedAt?: Timestamp
  acceptedBy?: string
}

export type Role = 'owner' | 'manager' | 'warehouse' | 'buyer'

export interface TenantClaims {
  tenantId: string
  role: Role
}

const ROLES: readonly Role[] = ['owner', 'manager', 'warehouse', 'buyer']

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

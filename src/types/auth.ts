export type Role = 'owner' | 'manager' | 'warehouse' | 'buyer'

export interface TenantClaims {
  tenantId: string
  role: Role
}

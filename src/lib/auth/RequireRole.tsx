import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { Role } from '../../types/auth'

interface RequireRoleProps {
  /** Omit to require any authenticated tenant member, regardless of role. */
  roles?: readonly Role[]
  children: ReactNode
  /** Where to send an unauthenticated user. */
  redirectTo?: string
  /**
   * Where to send an authenticated user with no tenant/role claim yet.
   * Defaults to `redirectTo` for callers that don't distinguish the two cases.
   */
  noTenantRedirectTo?: string
}

/**
 * Client-side half of governance Check III (RBAC in UI and rules):
 * "A permission boundary enforced only in Firestore rules and not reflected
 * in the UI (or vice versa) is incomplete." firestore.rules is the real
 * enforcement; this is the UI's reflection of the same policy, so a denied
 * route doesn't even attempt requests the rules would reject anyway.
 */
export function RequireRole({
  roles,
  children,
  redirectTo = '/',
  noTenantRedirectTo,
}: RequireRoleProps) {
  const { user, tenantId, role, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  if (!tenantId || !role) {
    return <Navigate to={noTenantRedirectTo ?? redirectTo} replace />
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

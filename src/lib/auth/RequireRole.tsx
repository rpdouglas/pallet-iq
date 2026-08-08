import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { Role } from '../../types/auth'

interface RequireRoleProps {
  /** Omit to require any authenticated tenant member, regardless of role. */
  roles?: readonly Role[]
  children: ReactNode
  redirectTo?: string
}

/**
 * Client-side half of governance Check III (RBAC in UI and rules):
 * "A permission boundary enforced only in Firestore rules and not reflected
 * in the UI (or vice versa) is incomplete." firestore.rules is the real
 * enforcement; this is the UI's reflection of the same policy, so a denied
 * route doesn't even attempt requests the rules would reject anyway.
 */
export function RequireRole({ roles, children, redirectTo = '/' }: RequireRoleProps) {
  const { user, tenantId, role, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user || !tenantId || !role) {
    return <Navigate to={redirectTo} replace />
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

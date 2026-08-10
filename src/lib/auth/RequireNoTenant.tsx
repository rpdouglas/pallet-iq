import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

interface RequireNoTenantProps {
  children: ReactNode
  /** Where to send an unauthenticated user. */
  redirectTo?: string
  /** Where to send a user who already has a tenant/role claim. */
  tenantRedirectTo?: string
}

/**
 * Gates onboarding: only an authenticated user with no tenant/role claim yet
 * belongs here. Everyone else is somewhere else in the flow already.
 */
export function RequireNoTenant({
  children,
  redirectTo = '/signin',
  tenantRedirectTo = '/',
}: RequireNoTenantProps) {
  const { user, tenantId, role, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  if (tenantId && role) {
    return <Navigate to={tenantRedirectTo} replace />
  }

  return <>{children}</>
}

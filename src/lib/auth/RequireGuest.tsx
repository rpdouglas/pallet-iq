import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

/**
 * Inverse of RequireRole: gates sign-in/sign-up so an already-authenticated
 * user doesn't land back on them. Sent to wherever they actually belong
 * (onboarding vs. the app) rather than a single fixed target.
 */
export function RequireGuest({ children }: { children: ReactNode }) {
  const { user, tenantId, role, loading } = useAuth()

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to={tenantId && role ? '/' : '/onboarding'} replace />
  }

  return <>{children}</>
}

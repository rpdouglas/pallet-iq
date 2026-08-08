import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { Role } from '../../types/auth'

export interface AuthState {
  user: User | null
  tenantId: string | null
  role: Role | null
  loading: boolean
  /**
   * Forces a fresh ID token fetch and re-reads claims from it. Custom
   * claims set by a Cloud Function (createTenant, acceptInvite,
   * updateMemberRole) don't appear on the client's current token until
   * it's refreshed - call this immediately after those calls resolve,
   * before routing into tenant-scoped UI. See ADR-0003.
   */
  refreshClaims: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)

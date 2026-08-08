import { useEffect, useState, type ReactNode } from 'react'
import { onIdTokenChanged, type User } from 'firebase/auth'
import { auth } from '../firebase'
import { isRole, type Role } from '../../types/auth'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const readClaims = async (currentUser: User | null, forceRefresh: boolean) => {
    if (!currentUser) {
      setTenantId(null)
      setRole(null)
      return
    }
    const tokenResult = await currentUser.getIdTokenResult(forceRefresh)
    const claimTenantId = tokenResult.claims.tenantId
    const claimRole = tokenResult.claims.role
    setTenantId(typeof claimTenantId === 'string' ? claimTenantId : null)
    setRole(isRole(claimRole) ? claimRole : null)
  }

  useEffect(() => {
    // onIdTokenChanged (not onAuthStateChanged) so this also fires on the
    // periodic automatic token refresh, not just sign-in/sign-out.
    const unsubscribe = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser)
      void readClaims(currentUser, false).finally(() => {
        setLoading(false)
      })
    })
    return unsubscribe
  }, [])

  const refreshClaims = async () => {
    await readClaims(auth.currentUser, true)
  }

  return (
    <AuthContext.Provider value={{ user, tenantId, role, loading, refreshClaims }}>
      {children}
    </AuthContext.Provider>
  )
}

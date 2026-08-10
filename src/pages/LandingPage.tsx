import { PackageSearch } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth/useAuth'
import { signOutUser } from '../lib/auth/authActions'

interface TenantSettings {
  name: string
}

// The tenant's landing page immediately after onboarding. No CTA to a real
// feature yet - vendor management (PALLETIQ-007) and the dashboard
// (PALLETIQ-010) don't exist, so per docs/design/components.md's Empty
// States guidance, this is a confirmation placeholder rather than a link to
// nowhere. Revisit with a real primary action once PALLETIQ-007 ships.
export function LandingPage() {
  const { tenantId } = useAuth()

  const { data: tenantName } = useQuery({
    queryKey: ['tenantSettings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null
      const snap = await getDoc(doc(db, `tenants/${tenantId}/settings/general`))
      return (snap.data() as TenantSettings | undefined)?.name ?? null
    },
    enabled: !!tenantId,
  })

  return (
    <main className="bg-cloud-gray flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <EmptyState
        icon={PackageSearch}
        message={
          tenantName
            ? `${tenantName} is set up. There's nothing here yet — feature pages are on the way.`
            : "You're set up. There's nothing here yet — feature pages are on the way."
        }
      />
      <Button variant="ghost" onClick={() => void signOutUser()}>
        Sign out
      </Button>
    </main>
  )
}

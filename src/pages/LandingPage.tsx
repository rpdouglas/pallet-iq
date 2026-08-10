import { PackageSearch } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonVariants'
import { EmptyState } from '../components/EmptyState'
import { db } from '../lib/firebase'
import { useAuth } from '../lib/auth/useAuth'
import { signOutUser } from '../lib/auth/authActions'

interface TenantSettings {
  name: string
}

// The tenant's landing page immediately after onboarding. PALLETIQ-007
// shipped the first real feature page (vendors), so this now has a real
// primary action instead of the dead-end placeholder PALLETIQ-006 left here
// per docs/design/components.md's Empty States guidance. Still no full
// dashboard (PALLETIQ-010) - just this one link for now.
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
            ? `${tenantName} is set up. Get started below.`
            : "You're set up. Get started below."
        }
        action={
          <Link to="/vendors" className={buttonClasses()}>
            Go to vendors
          </Link>
        }
      />
      <Button variant="ghost" onClick={() => void signOutUser()}>
        Sign out
      </Button>
    </main>
  )
}

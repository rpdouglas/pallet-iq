import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { buttonClasses } from '../components/buttonVariants'
import { useAuth } from '../lib/auth/useAuth'
import { acceptInvite } from '../lib/auth/tenantActions'
import { callableErrorMessage } from '../lib/auth/errors'

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading, refreshClaims } = useAuth()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const tenantId = searchParams.get('tenantId')
  const inviteId = searchParams.get('inviteId')
  const token = searchParams.get('token')

  if (!tenantId || !inviteId || !token) {
    return (
      <AuthCard>
        <p className="text-body text-ink-navy text-center">
          This invite link is missing information and can&apos;t be used. Ask whoever invited you to
          send a new one.
        </p>
      </AuthCard>
    )
  }

  if (authLoading) {
    return <AuthCard>{null}</AuthCard>
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return (
      <AuthCard>
        <p className="text-body text-ink-navy text-center">
          Sign in or create an account to accept this invite.
        </p>
        <div className="flex flex-col gap-2">
          <Link to={`/signin?redirect=${redirect}`} className={buttonClasses('primary', 'w-full')}>
            Sign in
          </Link>
          <Link
            to={`/signup?redirect=${redirect}`}
            className={buttonClasses('secondary', 'w-full')}
          >
            Create an account
          </Link>
        </div>
      </AuthCard>
    )
  }

  const onAccept = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await acceptInvite({ tenantId, inviteId, token })
      await refreshClaims()
      void navigate('/', { replace: true })
    } catch (err) {
      setError(callableErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard>
      <p className="text-body text-ink-navy text-center">
        You&apos;ve been invited to join a workspace.
      </p>
      {error ? <p className="text-label text-danger text-center">{error}</p> : null}
      <Button type="button" disabled={submitting} onClick={() => void onAccept()}>
        {submitting ? 'Joining…' : 'Accept invite & join'}
      </Button>
    </AuthCard>
  )
}

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { TextField } from '../components/form/TextField'
import { useAuth } from '../lib/auth/useAuth'
import { createTenant } from '../lib/auth/tenantActions'
import { callableErrorMessage } from '../lib/auth/errors'
import { tenantNameSchema, type TenantNameFormValues } from '../lib/auth/schemas'

// The only place createTenant is called - see PALLETIQ-006's scope note.
// A user who arrived here via an invite link instead accepts it on
// AcceptInvitePage, which calls acceptInvite directly and never routes
// through here.
export function OnboardingPage() {
  const navigate = useNavigate()
  const { refreshClaims } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TenantNameFormValues>({ resolver: zodResolver(tenantNameSchema) })

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      await createTenant(data.tenantName)
      await refreshClaims()
      void navigate('/', { replace: true })
    } catch (error) {
      setFormError(callableErrorMessage(error))
    }
  })

  return (
    <AuthCard>
      <p className="text-body text-ink-navy text-center">Name your workspace to get started.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Workspace name"
          autoComplete="organization"
          error={errors.tenantName?.message}
          {...register('tenantName')}
        />
        {formError ? <p className="text-label text-danger">{formError}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </AuthCard>
  )
}

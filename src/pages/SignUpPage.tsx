import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { TextField } from '../components/form/TextField'
import { signUp } from '../lib/auth/authActions'
import { authErrorMessage } from '../lib/auth/errors'
import { signUpSchema, type SignUpFormValues } from '../lib/auth/schemas'

// Only creates the Firebase Auth account - never calls createTenant. Where
// the resulting authenticated-but-tenantless user goes next (create a new
// workspace, or accept the invite that sent them here via `redirect`) is
// OnboardingPage/AcceptInvitePage's job, not this page's - one page, one
// responsibility, per PALLETIQ-006's scope note.
export function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({ resolver: zodResolver(signUpSchema) })

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      await signUp(data.email, data.password)
      void navigate(redirect ?? '/', { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  })

  return (
    <AuthCard>
      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError ? <p className="text-label text-danger">{formError}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="text-label text-slate-gray text-center">
        Already have an account?{' '}
        <Link
          to={redirect ? `/signin?redirect=${encodeURIComponent(redirect)}` : '/signin'}
          className="text-brand-blue"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}

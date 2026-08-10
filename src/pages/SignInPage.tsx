import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { TextField } from '../components/form/TextField'
import { signIn } from '../lib/auth/authActions'
import { authErrorMessage } from '../lib/auth/errors'
import { signInSchema, type SignInFormValues } from '../lib/auth/schemas'

export function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({ resolver: zodResolver(signInSchema) })

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      await signIn(data.email, data.password)
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {formError ? <p className="text-label text-danger">{formError}</p> : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-label text-slate-gray text-center">
        Need a workspace?{' '}
        <Link
          to={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup'}
          className="text-brand-blue"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}

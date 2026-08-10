import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { RequireNoTenant } from './RequireNoTenant'
import { AuthContext, type AuthState } from './AuthContext'

const baseAuthState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  loading: false,
  refreshClaims: () => Promise.resolve(),
}

function renderOnboardingRoute(authState: AuthState) {
  return render(
    <AuthContext.Provider value={authState}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route
            path="/onboarding"
            element={
              <RequireNoTenant>
                <div>Onboarding form</div>
              </RequireNoTenant>
            }
          />
          <Route path="/signin" element={<div>Sign in</div>} />
          <Route path="/" element={<div>App home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireNoTenant', () => {
  it('renders nothing while auth state is still loading', () => {
    const { container } = renderOnboardingRoute({ ...baseAuthState, loading: true })

    expect(container).toBeEmptyDOMElement()
  })

  it('redirects an unauthenticated user to sign-in', () => {
    renderOnboardingRoute(baseAuthState)

    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders children for an authenticated user with no tenant yet', () => {
    renderOnboardingRoute({ ...baseAuthState, user: {} as User })

    expect(screen.getByText('Onboarding form')).toBeInTheDocument()
  })

  it('redirects a user who already has a tenant to the app', () => {
    renderOnboardingRoute({
      ...baseAuthState,
      user: {} as User,
      tenantId: 'tenant-a',
      role: 'owner',
    })

    expect(screen.getByText('App home')).toBeInTheDocument()
  })
})

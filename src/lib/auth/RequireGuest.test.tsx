import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { RequireGuest } from './RequireGuest'
import { AuthContext, type AuthState } from './AuthContext'

const baseAuthState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  loading: false,
  refreshClaims: () => Promise.resolve(),
}

function renderGuestRoute(authState: AuthState) {
  return render(
    <AuthContext.Provider value={authState}>
      <MemoryRouter initialEntries={['/signin']}>
        <Routes>
          <Route
            path="/signin"
            element={
              <RequireGuest>
                <div>Sign in form</div>
              </RequireGuest>
            }
          />
          <Route path="/" element={<div>App home</div>} />
          <Route path="/onboarding" element={<div>Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireGuest', () => {
  it('renders nothing while auth state is still loading', () => {
    const { container } = renderGuestRoute({ ...baseAuthState, loading: true })

    expect(container).toBeEmptyDOMElement()
  })

  it('renders children for an unauthenticated user', () => {
    renderGuestRoute(baseAuthState)

    expect(screen.getByText('Sign in form')).toBeInTheDocument()
  })

  it('redirects a fully authenticated user to the app', () => {
    renderGuestRoute({ ...baseAuthState, user: {} as User, tenantId: 'tenant-a', role: 'owner' })

    expect(screen.getByText('App home')).toBeInTheDocument()
  })

  it('redirects an authenticated user with no tenant yet to onboarding', () => {
    renderGuestRoute({ ...baseAuthState, user: {} as User })

    expect(screen.getByText('Onboarding')).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { RequireRole } from './RequireRole'
import { AuthContext, type AuthState } from './AuthContext'
import type { Role } from '../../types/auth'

const baseAuthState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  loading: false,
  refreshClaims: () => Promise.resolve(),
}

function renderProtected(authState: AuthState, roles?: readonly Role[]) {
  return render(
    <AuthContext.Provider value={authState}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RequireRole roles={roles}>
                <div>Protected content</div>
              </RequireRole>
            }
          />
          <Route path="/" element={<div>Redirected home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireRole', () => {
  it('renders nothing while auth state is still loading', () => {
    const { container } = renderProtected({ ...baseAuthState, loading: true })

    expect(container).toBeEmptyDOMElement()
  })

  it('redirects an unauthenticated user', () => {
    renderProtected(baseAuthState)

    expect(screen.getByText('Redirected home')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('redirects an authenticated user with the wrong role', () => {
    renderProtected(
      {
        ...baseAuthState,
        user: {} as User,
        tenantId: 'tenant-a',
        role: 'buyer',
      },
      ['owner', 'manager'],
    )

    expect(screen.getByText('Redirected home')).toBeInTheDocument()
  })

  it('renders children for an authenticated user with an allowed role', () => {
    renderProtected(
      {
        ...baseAuthState,
        user: {} as User,
        tenantId: 'tenant-a',
        role: 'owner',
      },
      ['owner', 'manager'],
    )

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('renders children for any authenticated tenant member when no roles are specified', () => {
    renderProtected({
      ...baseAuthState,
      user: {} as User,
      tenantId: 'tenant-a',
      role: 'warehouse',
    })

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })
})

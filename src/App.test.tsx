import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import App from './App'
import { AuthContext, type AuthState } from './lib/auth/AuthContext'

vi.mock('./lib/firebase', () => ({ auth: {}, db: {}, app: {}, storage: {} }))
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockReturnValue(new Promise(() => undefined)),
}))
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}))
vi.mock('./lib/auth/tenantActions', () => ({
  createTenant: vi.fn(),
  acceptInvite: vi.fn(),
}))
vi.mock('./lib/vendors/vendorActions', () => ({
  listVendors: vi.fn().mockReturnValue(new Promise(() => undefined)),
  createVendor: vi.fn(),
  updateVendor: vi.fn(),
  deleteVendor: vi.fn(),
}))
vi.mock('./lib/manifests/manifestActions', () => ({
  listImports: vi.fn().mockReturnValue(new Promise(() => undefined)),
  getImport: vi.fn().mockReturnValue(new Promise(() => undefined)),
  listLineItems: vi.fn().mockReturnValue(new Promise(() => undefined)),
  listImportErrors: vi.fn().mockReturnValue(new Promise(() => undefined)),
  newImportId: vi.fn(),
  uploadManifestFile: vi.fn(),
  enqueueManifestImport: vi.fn(),
}))

const baseAuthState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  loading: false,
  refreshClaims: () => Promise.resolve(),
}

function renderApp(authState: AuthState, initialEntry = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('App routing', () => {
  it('sends an unauthenticated visitor at "/" to sign-in', () => {
    renderApp(baseAuthState)

    expect(screen.getByRole('heading', { name: 'PalletIQ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('sends an authenticated user with no tenant at "/" to onboarding', () => {
    renderApp({ ...baseAuthState, user: {} as User })

    expect(screen.getByLabelText('Workspace name')).toBeInTheDocument()
  })

  it('renders the landing page for a fully authenticated tenant member', () => {
    renderApp({ ...baseAuthState, user: {} as User, tenantId: 'tenant-a', role: 'owner' })

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('redirects an already-authenticated user away from sign-in', () => {
    renderApp(
      { ...baseAuthState, user: {} as User, tenantId: 'tenant-a', role: 'owner' },
      '/signin',
    )

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('redirects an unknown route to "/"', () => {
    renderApp(baseAuthState, '/some/unknown/route')

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'

vi.mock('../lib/firebase', () => ({ db: {} }))

const doc = vi.fn<(...args: unknown[]) => unknown>()
const getDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('firebase/firestore', () => ({ doc, getDoc }))

const signOutUser = vi.fn<() => Promise<void>>()
vi.mock('../lib/auth/authActions', () => ({ signOutUser }))

const { LandingPage } = await import('./LandingPage')

const authState: AuthState = {
  user: {} as User,
  tenantId: 'tenant-a',
  role: 'owner',
  loading: false,
  refreshClaims: () => Promise.resolve(),
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('LandingPage', () => {
  it('shows a generic placeholder before the tenant name loads', () => {
    getDoc.mockReturnValue(new Promise(() => undefined))
    renderPage()

    expect(screen.getByText(/you're set up/i)).toBeInTheDocument()
  })

  it('shows the tenant name once loaded', async () => {
    getDoc.mockResolvedValueOnce({ data: () => ({ name: 'Acme Liquidation' }) })
    renderPage()

    expect(await screen.findByText(/Acme Liquidation is set up/)).toBeInTheDocument()
  })

  it('signs out when the button is clicked', () => {
    getDoc.mockReturnValue(new Promise(() => undefined))
    renderPage()

    screen.getByRole('button', { name: /sign out/i }).click()

    expect(signOutUser).toHaveBeenCalled()
  })

  it('links to the vendors page as the primary action', () => {
    getDoc.mockReturnValue(new Promise(() => undefined))
    renderPage()

    expect(screen.getByRole('link', { name: 'Go to vendors' }).getAttribute('href')).toBe(
      '/vendors',
    )
  })
})

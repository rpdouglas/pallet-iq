import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'

const signOutUser = vi.fn<() => Promise<void>>()
vi.mock('../lib/auth/authActions', () => ({ signOutUser }))

const { AppShell } = await import('./AppShell')

function renderShell(initialEntry = '/', role: Role = 'manager') {
  const authState: AuthState = {
    user: {} as User,
    tenantId: 'tenant-a',
    role,
    loading: false,
    refreshClaims: () => Promise.resolve(),
  }
  return render(
    <AuthContext.Provider value={authState}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<div>Dashboard content</div>} />
            <Route path="/vendors" element={<div>Vendors content</div>} />
            <Route path="/manifests" element={<div>Manifests content</div>} />
            <Route path="/inventory" element={<div>Inventory content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppShell', () => {
  it('renders links to every existing page and nothing else for a role without scan access', () => {
    renderShell('/', 'manager')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Vendors' })).toHaveAttribute('href', '/vendors')
    expect(screen.getByRole('link', { name: 'Manifests' })).toHaveAttribute('href', '/manifests')
    expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', '/inventory')
    expect(screen.queryByRole('link', { name: 'Scan item' })).not.toBeInTheDocument()
  })

  it('marks the current route as active via aria-current', () => {
    renderShell('/vendors')

    expect(screen.getByRole('link', { name: 'Vendors' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it("marks '/' active only exactly, not as a prefix of every route", () => {
    renderShell('/vendors')

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('renders the routed page content via Outlet', () => {
    renderShell('/manifests')

    expect(screen.getByText('Manifests content')).toBeInTheDocument()
  })

  it('signs out when Sign out is clicked', () => {
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    expect(signOutUser).toHaveBeenCalled()
  })

  it('opens a mobile menu with the same nav links when the hamburger is clicked, and closes on navigate', () => {
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

    const vendorsLinks = screen.getAllByRole('link', { name: 'Vendors' })
    expect(vendorsLinks).toHaveLength(2)
    const mobileVendorsLink = vendorsLinks[1]
    if (!mobileVendorsLink) {
      throw new Error('Expected a second (mobile menu) Vendors link.')
    }

    fireEvent.click(mobileVendorsLink)

    expect(screen.getAllByRole('link', { name: 'Vendors' })).toHaveLength(1)
  })

  it.each(['owner', 'buyer'] as const)('shows a Scan item nav link and FAB for a %s', (role) => {
    renderShell('/', role)

    expect(screen.getAllByRole('link', { name: 'Scan item' }).length).toBeGreaterThan(0)
  })

  it.each(['manager', 'warehouse'] as const)(
    'omits the Scan item nav link and FAB for a %s (not shown-and-disabled)',
    (role) => {
      renderShell('/', role)

      expect(screen.queryByRole('link', { name: 'Scan item' })).not.toBeInTheDocument()
    },
  )
})

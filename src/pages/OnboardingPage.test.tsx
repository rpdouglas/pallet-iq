import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'

const createTenant = vi.fn<(tenantName: string) => Promise<{ tenantId: string }>>()
vi.mock('../lib/auth/tenantActions', () => ({ createTenant }))

const { OnboardingPage } = await import('./OnboardingPage')

const refreshClaims = vi.fn().mockResolvedValue(undefined)
const baseAuthState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  loading: false,
  refreshClaims,
}

function renderPage() {
  return render(
    <AuthContext.Provider value={baseAuthState}>
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<div>App home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('OnboardingPage', () => {
  it('requires a workspace name before submitting', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }))

    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument()
    expect(createTenant).not.toHaveBeenCalled()
  })

  it('creates the tenant, refreshes claims, then navigates to the app', async () => {
    createTenant.mockResolvedValueOnce({ tenantId: 'tenant-a' })
    renderPage()

    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: 'Acme Liquidation' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }))

    expect(await screen.findByText('App home')).toBeInTheDocument()
    expect(createTenant).toHaveBeenCalledWith('Acme Liquidation')
    expect(refreshClaims).toHaveBeenCalled()
  })

  it('shows the server-provided error message on failure', async () => {
    createTenant.mockRejectedValueOnce(new Error('This account already belongs to a tenant.'))
    renderPage()

    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: 'Acme Liquidation' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }))

    await waitFor(() => {
      expect(screen.getByText('This account already belongs to a tenant.')).toBeInTheDocument()
    })
  })
})

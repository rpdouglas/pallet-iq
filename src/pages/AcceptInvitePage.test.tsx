import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { User } from 'firebase/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'

const acceptInvite = vi.fn<
  (params: { tenantId: string; inviteId: string; token: string }) => Promise<{
    tenantId: string
    role: string
  }>
>()
vi.mock('../lib/auth/tenantActions', () => ({ acceptInvite }))

const { AcceptInvitePage } = await import('./AcceptInvitePage')

const refreshClaims = vi.fn().mockResolvedValue(undefined)
const baseAuthState: AuthState = {
  user: null,
  tenantId: null,
  role: null,
  loading: false,
  refreshClaims,
}

const INVITE_PATH = '/accept-invite?tenantId=tenant-a&inviteId=invite-1&token=abc123'

function renderPage(authState: AuthState, path = INVITE_PATH) {
  return render(
    <AuthContext.Provider value={authState}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/signin" element={<div>Sign in page</div>} />
          <Route path="/signup" element={<div>Sign up page</div>} />
          <Route path="/" element={<div>App home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AcceptInvitePage', () => {
  it('shows an error for a link missing invite parameters', () => {
    renderPage(baseAuthState, '/accept-invite?tenantId=tenant-a')

    expect(screen.getByText(/missing information/i)).toBeInTheDocument()
  })

  it('offers sign-in/sign-up links preserving the invite link when unauthenticated', () => {
    renderPage(baseAuthState)

    const signInLink = screen.getByRole('link', { name: 'Sign in' })
    expect(signInLink.getAttribute('href')).toBe(
      `/signin?redirect=${encodeURIComponent(INVITE_PATH)}`,
    )
  })

  it('accepts the invite, refreshes claims, and navigates to the app', async () => {
    acceptInvite.mockResolvedValueOnce({ tenantId: 'tenant-a', role: 'buyer' })
    renderPage({ ...baseAuthState, user: {} as User })

    fireEvent.click(screen.getByRole('button', { name: /accept invite/i }))

    expect(await screen.findByText('App home')).toBeInTheDocument()
    expect(acceptInvite).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      inviteId: 'invite-1',
      token: 'abc123',
    })
    expect(refreshClaims).toHaveBeenCalled()
  })

  it('shows the server-provided error message on failure', async () => {
    acceptInvite.mockRejectedValueOnce(new Error('This invite has expired.'))
    renderPage({ ...baseAuthState, user: {} as User })

    fireEvent.click(screen.getByRole('button', { name: /accept invite/i }))

    await waitFor(() => {
      expect(screen.getByText('This invite has expired.')).toBeInTheDocument()
    })
  })
})

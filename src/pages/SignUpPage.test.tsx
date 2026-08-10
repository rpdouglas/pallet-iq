import { FirebaseError } from 'firebase/app'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const signUp = vi.fn<(email: string, password: string) => Promise<void>>()
vi.mock('../lib/auth/authActions', () => ({ signUp }))

const { SignUpPage } = await import('./SignUpPage')

function renderPage(initialEntry = '/signup') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/" element={<div>App home</div>} />
        <Route path="/accept-invite" element={<div>Accept invite</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
}

describe('SignUpPage', () => {
  it('rejects a password that fails the deployed password policy', async () => {
    renderPage()

    fillAndSubmit('owner@example.com', 'short')

    expect(await screen.findByText('Must be at least 10 characters')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('creates the account and navigates to the app on success (never calls createTenant)', async () => {
    signUp.mockResolvedValueOnce(undefined)
    renderPage()

    fillAndSubmit('owner@example.com', 'Password123')

    expect(await screen.findByText('App home')).toBeInTheDocument()
    expect(signUp).toHaveBeenCalledWith('owner@example.com', 'Password123')
  })

  it('honors a redirect search param on success, e.g. back to an invite link', async () => {
    signUp.mockResolvedValueOnce(undefined)
    renderPage('/signup?redirect=%2Faccept-invite')

    fillAndSubmit('owner@example.com', 'Password123')

    expect(await screen.findByText('Accept invite')).toBeInTheDocument()
  })

  it('shows a friendly message when sign-up fails', async () => {
    signUp.mockRejectedValueOnce(new FirebaseError('auth/email-already-in-use', 'raw'))
    renderPage()

    fillAndSubmit('owner@example.com', 'Password123')

    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument()
    })
  })
})

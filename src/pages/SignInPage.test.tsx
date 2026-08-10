import { FirebaseError } from 'firebase/app'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const signIn = vi.fn<(email: string, password: string) => Promise<void>>()
vi.mock('../lib/auth/authActions', () => ({ signIn }))

const { SignInPage } = await import('./SignInPage')

function renderPage(initialEntry = '/signin') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/" element={<div>App home</div>} />
        <Route path="/onboarding" element={<div>Onboarding</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('SignInPage', () => {
  it('shows validation errors instead of submitting when fields are empty', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('signs in and navigates to the app on success', async () => {
    signIn.mockResolvedValueOnce(undefined)
    renderPage()

    fillAndSubmit('owner@example.com', 'Password123')

    expect(await screen.findByText('App home')).toBeInTheDocument()
    expect(signIn).toHaveBeenCalledWith('owner@example.com', 'Password123')
  })

  it('honors a redirect search param on success', async () => {
    signIn.mockResolvedValueOnce(undefined)
    renderPage('/signin?redirect=%2Fonboarding')

    fillAndSubmit('owner@example.com', 'Password123')

    expect(await screen.findByText('Onboarding')).toBeInTheDocument()
  })

  it('shows a friendly message when sign-in fails', async () => {
    signIn.mockRejectedValueOnce(new FirebaseError('auth/invalid-credential', 'raw'))
    renderPage()

    fillAndSubmit('owner@example.com', 'wrongpassword')

    await waitFor(() => {
      expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument()
    })
  })
})

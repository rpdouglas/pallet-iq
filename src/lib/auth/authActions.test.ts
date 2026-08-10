import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ auth: { currentUser: null } }))

const createUserWithEmailAndPassword = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const signInWithEmailAndPassword = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const signOut = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
}))

const { signUp, signIn, signOutUser } = await import('./authActions')
const { auth } = await import('../firebase')

describe('authActions', () => {
  it('signUp creates a Firebase Auth account with email/password', async () => {
    await signUp('owner@example.com', 'Password123')

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'owner@example.com',
      'Password123',
    )
  })

  it('signIn calls Firebase Auth sign-in with email/password', async () => {
    await signIn('owner@example.com', 'Password123')

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'owner@example.com',
      'Password123',
    )
  })

  it('signOutUser signs the current user out', async () => {
    await signOutUser()

    expect(signOut).toHaveBeenCalledWith(auth)
  })
})

import { FirebaseError } from 'firebase/app'
import { describe, expect, it } from 'vitest'
import { authErrorMessage, callableErrorMessage } from './errors'

describe('authErrorMessage', () => {
  it('maps a known Firebase Auth error code to friendly copy', () => {
    expect(authErrorMessage(new FirebaseError('auth/email-already-in-use', 'raw'))).toBe(
      'An account with this email already exists.',
    )
  })

  it('falls back for an unmapped Firebase error code', () => {
    expect(authErrorMessage(new FirebaseError('auth/some-new-code', 'raw'))).toBe(
      'Something went wrong. Please try again.',
    )
  })

  it('falls back for a non-Firebase error', () => {
    expect(authErrorMessage(new Error('network down'))).toBe(
      'Something went wrong. Please try again.',
    )
  })
})

describe('callableErrorMessage', () => {
  it('passes through an Error message from a callable HttpsError', () => {
    expect(callableErrorMessage(new Error('This invite has expired.'))).toBe(
      'This invite has expired.',
    )
  })

  it('falls back for a non-Error thrown value', () => {
    expect(callableErrorMessage('boom')).toBe('Something went wrong. Please try again.')
  })
})

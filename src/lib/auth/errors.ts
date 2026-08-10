import { FirebaseError } from 'firebase/app'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/weak-password': 'Choose a stronger password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/user-disabled': 'This account has been disabled.',
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

/** For direct Firebase Auth SDK errors (sign-in/sign-up) - maps opaque codes to copy. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? FALLBACK_MESSAGE
  }
  return FALLBACK_MESSAGE
}

/**
 * For our own Cloud Functions callables (createTenant, acceptInvite) - their
 * HttpsError messages are already human-readable, so pass them through
 * instead of re-mapping by code.
 */
export function callableErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_MESSAGE
}

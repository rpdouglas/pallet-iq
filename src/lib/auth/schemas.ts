import { z } from 'zod'

export const emailSchema = z.email('Enter a valid email address')

// Mirrors the deployed Firebase Auth password policy (minPasswordLength: 10,
// requires lowercase + uppercase + numeric, ENFORCE) - see docs/ACTIVE_CYCLE.md's
// 2026-08-08 testing/security review note. Client-side copy of a server-enforced
// rule, so it can't silently drift without someone noticing the mismatch in review.
export const passwordSchema = z
  .string()
  .min(10, 'Must be at least 10 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/[0-9]/, 'Include a number')

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})
export type SignInFormValues = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})
export type SignUpFormValues = z.infer<typeof signUpSchema>

export const tenantNameSchema = z.object({
  tenantName: z.string().trim().min(1, 'Workspace name is required').max(120),
})
export type TenantNameFormValues = z.infer<typeof tenantNameSchema>

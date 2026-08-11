import type { ReactNode } from 'react'
import { BrandMark } from './BrandMark'

// Shared centered-card layout for the pre-tenant auth/onboarding pages
// (sign-in, sign-up, onboarding, accept-invite). No sidebar/app-shell yet -
// that pattern starts with PALLETIQ-010's dashboard - so these are simple
// responsive cards by default rather than an instance of
// docs/design/mobile-responsive.md's desktop-first sidebar pattern.
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="bg-cloud-gray flex min-h-svh items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl bg-white p-8 shadow-sm">
        <BrandMark tagline />
        {children}
      </div>
    </main>
  )
}

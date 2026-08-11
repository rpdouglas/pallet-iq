import type { ReactNode } from 'react'
import palletIqLogoLockup from '../assets/palletiq-logo-lockup.png'

// Shared centered-card layout for the pre-tenant auth/onboarding pages
// (sign-in, sign-up, onboarding, accept-invite). No sidebar/app-shell yet -
// that pattern starts with PALLETIQ-010's dashboard - so these are simple
// responsive cards by default rather than an instance of
// docs/design/mobile-responsive.md's desktop-first sidebar pattern.
//
// PALLETIQ-019: the brand mark here is a single flattened image (icon +
// wordmark + tagline baked into one PNG, white-on-brand-blue), not the
// composed BrandMark used in AppShell's sidebar - see that ticket's
// BACKLOG.md scope note for why the two diverged.
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="bg-cloud-gray flex min-h-svh items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl bg-white p-8 shadow-sm">
        <img
          src={palletIqLogoLockup}
          alt="PalletIQ - Smarter Buys. Higher Profits."
          className="h-auto w-full rounded-xl"
        />
        {children}
      </div>
    </main>
  )
}

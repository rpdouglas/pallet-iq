import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireGuest } from './lib/auth/RequireGuest'
import { RequireNoTenant } from './lib/auth/RequireNoTenant'
import { RequireRole } from './lib/auth/RequireRole'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { LandingPage } from './pages/LandingPage'
import { ManifestDetailPage } from './pages/ManifestDetailPage'
import { ManifestsPage } from './pages/ManifestsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { VendorsPage } from './pages/VendorsPage'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireRole redirectTo="/signin" noTenantRedirectTo="/onboarding">
            <LandingPage />
          </RequireRole>
        }
      />
      <Route
        path="/signin"
        element={
          <RequireGuest>
            <SignInPage />
          </RequireGuest>
        }
      />
      <Route
        path="/signup"
        element={
          <RequireGuest>
            <SignUpPage />
          </RequireGuest>
        }
      />
      <Route
        path="/onboarding"
        element={
          <RequireNoTenant>
            <OnboardingPage />
          </RequireNoTenant>
        }
      />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route
        path="/vendors"
        element={
          <RequireRole redirectTo="/signin" noTenantRedirectTo="/onboarding">
            <VendorsPage />
          </RequireRole>
        }
      />
      <Route
        path="/manifests"
        element={
          <RequireRole redirectTo="/signin" noTenantRedirectTo="/onboarding">
            <ManifestsPage />
          </RequireRole>
        }
      />
      <Route
        path="/manifests/:importId"
        element={
          <RequireRole redirectTo="/signin" noTenantRedirectTo="/onboarding">
            <ManifestDetailPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

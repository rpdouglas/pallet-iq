import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireGuest } from './lib/auth/RequireGuest'
import { RequireNoTenant } from './lib/auth/RequireNoTenant'
import { RequireRole } from './lib/auth/RequireRole'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { ItemScanPage } from './pages/ItemScanPage'
import { ManifestDetailPage } from './pages/ManifestDetailPage'
import { ManifestsPage } from './pages/ManifestsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { VendorsPage } from './pages/VendorsPage'
import { WatchlistPage } from './pages/WatchlistPage'

function App() {
  return (
    <Routes>
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
        element={
          <RequireRole redirectTo="/signin" noTenantRedirectTo="/onboarding">
            <AppShell />
          </RequireRole>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/manifests" element={<ManifestsPage />} />
        <Route path="/manifests/:importId" element={<ManifestDetailPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route
          path="/scan"
          element={
            <RequireRole roles={['owner', 'buyer']}>
              <ItemScanPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

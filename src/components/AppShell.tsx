import { useState } from 'react'
import { Boxes, Building2, FileSpreadsheet, LayoutDashboard, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark } from './BrandMark'
import { signOutUser } from '../lib/auth/authActions'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

// Only pages that actually exist - no dead links to Pallets/Analytics/
// Settings, which aren't built yet.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendors', label: 'Vendors', icon: Building2 },
  { to: '/manifests', label: 'Manifests', icon: FileSpreadsheet },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
]

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  // Pallet-IQ-Design-System.md §4 Navigation: Brand Blue pill + white text
  // when active, light gray/white at reduced opacity when inactive.
  return `text-body flex items-center gap-3 rounded-full px-4 py-2 font-medium ${
    isActive ? 'bg-brand-blue text-white' : 'text-white/70 hover:text-white'
  }`
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate} className={navLinkClassName}>
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

// Not the shared Button component - its `ghost` variant's `hover:bg-cloud-gray`
// is meant for light surfaces and would show a light box against this dark
// sidebar. Styled to match the nav links' own light-gray/white-at-reduced-
// opacity treatment instead, per Pallet-IQ-Design-System.md §4.
function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOutUser()}
      className="text-body flex items-center gap-3 rounded-full px-4 py-2 font-medium text-white/70 hover:bg-white/10 hover:text-white"
    >
      Sign out
    </button>
  )
}

// docs/design/mobile-responsive.md: sidebar nav from md up, collapses to a
// top app bar with a hamburger/drawer below md - a fallback for narrow
// windows, not Warehouse's real mobile-first nav (that's a bottom tab bar,
// deferred to whichever ticket builds Phase 3's barcode/mobile-receiving
// screens - PALLETIQ-011's own scope note corrects an earlier assumption
// that this was its job; "basic" Phase 1 inventory tracking stays in this
// shell like every other page. Every role uses this shell for now).
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="md:flex md:min-h-svh">
      <aside className="from-navy to-ink-navy hidden w-64 shrink-0 flex-col gap-8 bg-gradient-to-b p-6 md:flex">
        <BrandMark />
        <NavLinks />
        <div className="mt-auto">
          <SignOutButton />
        </div>
      </aside>

      <header className="from-navy to-ink-navy flex items-center justify-between bg-gradient-to-b p-4 md:hidden">
        <BrandMark />
        <button
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => {
            setMobileOpen((open) => !open)
          }}
          className="text-white"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>
      {mobileOpen ? (
        <div className="from-navy to-ink-navy flex flex-col gap-8 bg-gradient-to-b p-6 md:hidden">
          <NavLinks
            onNavigate={() => {
              setMobileOpen(false)
            }}
          />
          <SignOutButton />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

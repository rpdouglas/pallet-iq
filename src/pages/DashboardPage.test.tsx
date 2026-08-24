import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { Vendor } from '../types/vendor'
import type { ImportSummary } from '../types/manifest'

const listVendors = vi.fn<(tenantId: string) => Promise<Vendor[]>>()
vi.mock('../lib/vendors/vendorActions', () => ({ listVendors }))

const listImports = vi.fn<(tenantId: string) => Promise<ImportSummary[]>>()
vi.mock('../lib/manifests/manifestActions', () => ({ listImports }))

const { DashboardPage } = await import('./DashboardPage')

const VENDOR: Vendor = {
  id: 'vendor-1',
  name: 'Acme Liquidation',
  manifestFormat: 'csv',
  contactEmail: '',
  contactPhone: '',
  terms: '',
}

function makeImport(overrides: Partial<ImportSummary> = {}): ImportSummary {
  return {
    id: 'import-1',
    vendorId: 'vendor-1',
    format: 'csv',
    fileName: 'manifest.csv',
    status: 'completed',
    rowCount: 10,
    successCount: 9,
    errorCount: 1,
    error: null,
    freightCost: 0,
    otherFees: 0,
    totalPurchasePrice: null,
    sourceRestockLotId: null,
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authState: AuthState = {
    user: {} as User,
    tenantId: 'tenant-a',
    role: 'owner',
    loading: false,
    refreshClaims: () => Promise.resolve(),
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  it('shows real stat totals computed from vendors/imports, no fake/placeholder cards', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    listImports.mockResolvedValueOnce([
      makeImport({ id: 'import-1', successCount: 9, errorCount: 1 }),
      makeImport({ id: 'import-2', successCount: 4, errorCount: 0 }),
    ])
    renderPage()

    expect(await screen.findByText('13')).toBeInTheDocument() // 9 + 4 line items, once data loads
    expect(screen.getByText('Vendors')).toBeInTheDocument()
    expect(screen.getByText('Manifests imported')).toBeInTheDocument()
    expect(screen.getByText('Line items imported')).toBeInTheDocument()
    // 1 vendor and 1 total error both render "1" - scope to the specific
    // stat card rather than a bare getByText('1'), which would be ambiguous.
    expect(screen.getByText('Import errors').closest('div')).toHaveTextContent('1')

    // Explicitly not present - no data source for these yet (PALLETIQ-010 scope note).
    expect(screen.queryByText(/opportunit/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/inventory/i)).not.toBeInTheDocument()
  })

  it('shows recent imports with the vendor name resolved', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    listImports.mockResolvedValueOnce([makeImport()])
    renderPage()

    expect(await screen.findByText('Acme Liquidation')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('shows an empty state with a link to import a manifest when there are no imports', async () => {
    listVendors.mockResolvedValueOnce([])
    listImports.mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByText('No imports yet.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Import a manifest' })
    expect(link).toHaveAttribute('href', '/manifests')
  })
})

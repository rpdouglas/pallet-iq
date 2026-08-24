import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { ImportErrorRecord, ImportSummary, LineItem } from '../types/manifest'

const getImport = vi.fn<(tenantId: string, importId: string) => Promise<ImportSummary | null>>()
const listLineItems = vi.fn<(tenantId: string, importId: string) => Promise<LineItem[]>>()
const listImportErrors =
  vi.fn<(tenantId: string, importId: string) => Promise<ImportErrorRecord[]>>()
const updateImportCosts =
  vi.fn<
    (
      tenantId: string,
      importId: string,
      costs: { freightCost: number; otherFees: number },
    ) => Promise<void>
  >()
vi.mock('../lib/manifests/manifestActions', () => ({
  getImport,
  listLineItems,
  listImportErrors,
  updateImportCosts,
}))

const { ManifestDetailPage } = await import('./ManifestDetailPage')

const IMPORT: ImportSummary = {
  id: 'import-1',
  vendorId: 'vendor-1',
  format: 'csv',
  fileName: 'manifest.csv',
  status: 'completed',
  rowCount: 2,
  successCount: 1,
  errorCount: 1,
  error: null,
  // $10 freight + $5 fees over a $45 total purchase value (one $4.50 x 10
  // line item) -> 1.3333x multiplier -> landed cost $6.00 exactly.
  freightCost: 10,
  otherFees: 5,
  totalPurchasePrice: null,
  sourceRestockLotId: null,
}

const LINE_ITEM: LineItem = {
  id: 'item-1',
  sku: 'ABC-123',
  upc: null,
  description: 'Wireless Mouse',
  quantity: 10,
  unitCost: 4.5,
  condition: 'New',
  category: null,
}

const IMPORT_ERROR: ImportErrorRecord = {
  id: 'error-1',
  rowNumber: 3,
  reason: 'Missing description',
}

function renderPage(role: Role) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authState: AuthState = {
    user: {} as User,
    tenantId: 'tenant-a',
    role,
    loading: false,
    refreshClaims: () => Promise.resolve(),
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <MemoryRouter initialEntries={['/manifests/import-1']}>
          <Routes>
            <Route path="/manifests/:importId" element={<ManifestDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('ManifestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the unit cost column for a buyer', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('buyer')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(screen.getByText('Unit cost')).toBeInTheDocument()
    expect(screen.getByText('$4.50')).toBeInTheDocument()
  })

  it('omits the unit cost column for a warehouse-role user', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('warehouse')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(screen.queryByText('Unit cost')).not.toBeInTheDocument()
    expect(screen.queryByText('$4.50')).not.toBeInTheDocument()
  })

  it('shows the errors table when the import has errors', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('owner')

    expect(await screen.findByText("Rows that couldn't be imported")).toBeInTheDocument()
    expect(screen.getByText('Missing description')).toBeInTheDocument()
  })

  it('shows the import-level error message when the import failed', async () => {
    // errorCount stays 0 here - a rejection this early (before any row is
    // ever processed) never populates per-row imports_errors docs.
    getImport.mockResolvedValueOnce({
      ...IMPORT,
      status: 'failed',
      error: 'Macro-enabled files are not supported.',
      errorCount: 0,
    })
    listLineItems.mockResolvedValueOnce([])
    renderPage('owner')

    expect(await screen.findByText('Macro-enabled files are not supported.')).toBeInTheDocument()
  })

  it('does not show an error message for a completed import', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('owner')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(screen.queryByText(/not supported|invalid|exceeds/i)).not.toBeInTheDocument()
  })

  it('does not fetch errors when the import has none', async () => {
    getImport.mockResolvedValueOnce({ ...IMPORT, errorCount: 0 })
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    renderPage('owner')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(listImportErrors).not.toHaveBeenCalled()
  })

  it('shows the landed cost column with the value-weighted markup applied, for a buyer', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('buyer')

    expect(await screen.findByText('Landed cost')).toBeInTheDocument()
    // $10 freight + $5 fees over $45 total purchase value -> 1.3333x -> $6.00
    expect(screen.getByText('$6.00')).toBeInTheDocument()
    expect(screen.getByText("Adds 33.3% to every item's landed cost.")).toBeInTheDocument()
  })

  it('omits the landed cost column and shipping & fees form for a warehouse-role user', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('warehouse')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(screen.queryByText('Landed cost')).not.toBeInTheDocument()
    expect(screen.queryByText('$6.00')).not.toBeInTheDocument()
    expect(screen.queryByText('Shipping & fees')).not.toBeInTheDocument()
  })

  it('shows the shipping & fees form for a buyer', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('buyer')

    expect(await screen.findByText('Shipping & fees')).toBeInTheDocument()
  })

  it('does not show the shipping & fees form for a manager (read-only on imports)', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    renderPage('manager')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(screen.queryByText('Shipping & fees')).not.toBeInTheDocument()
  })

  it('saves edited freight/fees and shows a confirmation', async () => {
    getImport.mockResolvedValueOnce(IMPORT)
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    listImportErrors.mockResolvedValueOnce([IMPORT_ERROR])
    updateImportCosts.mockResolvedValueOnce(undefined)
    renderPage('owner')

    await screen.findByText('Shipping & fees')
    const freightInput = screen.getByLabelText('Freight cost')
    fireEvent.change(freightInput, { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateImportCosts).toHaveBeenCalledWith('tenant-a', 'import-1', {
        freightCost: 20,
        otherFees: 5,
      })
    })
    expect(await screen.findByText('Saved.')).toBeInTheDocument()
  })
})

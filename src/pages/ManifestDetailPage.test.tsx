import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
vi.mock('../lib/manifests/manifestActions', () => ({ getImport, listLineItems, listImportErrors }))

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

  it('does not fetch errors when the import has none', async () => {
    getImport.mockResolvedValueOnce({ ...IMPORT, errorCount: 0 })
    listLineItems.mockResolvedValueOnce([LINE_ITEM])
    renderPage('owner')

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument()
    expect(listImportErrors).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { Vendor } from '../types/vendor'
import type { ImportSummary } from '../types/manifest'

const listVendors = vi.fn<(tenantId: string) => Promise<Vendor[]>>()
vi.mock('../lib/vendors/vendorActions', () => ({ listVendors }))

const listImports = vi.fn<(tenantId: string) => Promise<ImportSummary[]>>()
const newImportId = vi.fn<(tenantId: string) => string>()
const uploadManifestFile =
  vi.fn<(tenantId: string, importId: string, file: File) => Promise<{ storagePath: string }>>()
const enqueueManifestImport =
  vi.fn<
    (params: {
      vendorId: string
      importId: string
      storagePath: string
      fileName: string
    }) => Promise<{ importId: string }>
  >()
vi.mock('../lib/manifests/manifestActions', () => ({
  listImports,
  newImportId,
  uploadManifestFile,
  enqueueManifestImport,
}))

const { ManifestsPage } = await import('./ManifestsPage')

// jsdom's <input type="file">.files is normally read-only, and jsdom doesn't
// implement DataTransfer (the usual RTL trick) - override it directly with
// a FileList-shaped array-like, which ImportForm's duck-typed schema accepts.
function selectFile(input: HTMLElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

const VENDOR: Vendor = {
  id: 'vendor-1',
  name: 'Acme Liquidation',
  manifestFormat: 'csv',
  contactEmail: '',
  contactPhone: '',
  terms: '',
}

const IMPORT: ImportSummary = {
  id: 'import-1',
  vendorId: 'vendor-1',
  format: 'csv',
  fileName: 'manifest.csv',
  status: 'completed',
  rowCount: 10,
  successCount: 9,
  errorCount: 1,
  error: null,
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
        <MemoryRouter>
          <ManifestsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('ManifestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state with an import action for a buyer when there are no imports', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    listImports.mockResolvedValueOnce([])
    renderPage('buyer')

    expect(await screen.findByText('No imports yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import a manifest' })).toBeInTheDocument()
  })

  it('shows an empty state with no action for a manager', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    listImports.mockResolvedValueOnce([])
    renderPage('manager')

    expect(await screen.findByText('No imports yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument()
  })

  it('renders the import list with the vendor name resolved', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    listImports.mockResolvedValueOnce([IMPORT])
    renderPage('buyer')

    expect(await screen.findByText('Acme Liquidation')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('imports a manifest: generates an ID, uploads the file, then enqueues the import', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    listImports.mockResolvedValueOnce([])
    newImportId.mockReturnValueOnce('import-1')
    uploadManifestFile.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
    })
    enqueueManifestImport.mockResolvedValueOnce({ importId: 'import-1' })
    renderPage('buyer')

    fireEvent.click(await screen.findByRole('button', { name: 'Import a manifest' }))
    fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'vendor-1' } })

    const file = new File(['description,quantity,unitCost'], 'manifest.csv', { type: 'text/csv' })
    const fileInput = screen.getByLabelText(/manifest file/i)
    selectFile(fileInput, file)

    fireEvent.click(screen.getByRole('button', { name: 'Import manifest' }))

    await waitFor(() => {
      expect(enqueueManifestImport).toHaveBeenCalledWith({
        vendorId: 'vendor-1',
        importId: 'import-1',
        storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
        fileName: 'manifest.csv',
      })
    })
    expect(uploadManifestFile).toHaveBeenCalledWith('tenant-a', 'import-1', file)
  })

  it('rejects a file whose extension does not match the selected vendor format', async () => {
    listVendors.mockResolvedValueOnce([VENDOR]) // csv vendor
    listImports.mockResolvedValueOnce([])
    renderPage('buyer')

    fireEvent.click(await screen.findByRole('button', { name: 'Import a manifest' }))
    fireEvent.change(screen.getByLabelText('Vendor'), { target: { value: 'vendor-1' } })

    const file = new File(['irrelevant'], 'manifest.xlsx')
    const fileInput = screen.getByLabelText(/manifest file/i)
    selectFile(fileInput, file)

    fireEvent.click(screen.getByRole('button', { name: 'Import manifest' }))

    expect(await screen.findByText(/CSV files - selected file is \.xlsx/)).toBeInTheDocument()
    expect(uploadManifestFile).not.toHaveBeenCalled()
    expect(enqueueManifestImport).not.toHaveBeenCalled()
  })
})

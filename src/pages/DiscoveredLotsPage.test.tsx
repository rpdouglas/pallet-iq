import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { ImportSummary } from '../types/manifest'
import type { RestockLot } from '../types/restockLot'

const listActiveRestockLots = vi.fn<() => Promise<RestockLot[]>>()
vi.mock('../lib/restockLots/restockLotsActions', () => ({ listActiveRestockLots }))

const listDismissedLotIds = vi.fn<(tenantId: string) => Promise<Set<string>>>()
const dismissLot = vi.fn<(...args: unknown[]) => Promise<void>>()
vi.mock('../lib/discoveredLots/dismissedLotsActions', () => ({
  listDismissedLotIds,
  dismissLot,
}))

const listDiscoveredLotImports = vi.fn<(tenantId: string) => Promise<Map<string, ImportSummary>>>()
const enqueueDiscoveredLotImport = vi.fn<(...args: unknown[]) => Promise<{ importId: string }>>()
vi.mock('../lib/discoveredLots/discoveredLotImportActions', () => ({
  listDiscoveredLotImports,
  enqueueDiscoveredLotImport,
}))

const { DiscoveredLotsPage } = await import('./DiscoveredLotsPage')

function timestamp(ms: number) {
  return { toMillis: () => ms, toDate: () => new Date(ms) } as RestockLot['firstSeenAt']
}

const OLDER_LOT: RestockLot = {
  id: '1011402',
  title: 'Staples Canada stacking chairs',
  category: 'Furniture',
  units: 40,
  condition: 'Returns',
  msrp: 199.99,
  price: 89.99,
  costPerUnit: 2.25,
  vendor: 'Staples Canada',
  warehouse: 'ON1',
  productUrl: 'https://restock.ca/lot/1011402',
  imageUrl: null,
  manifestUrl: null,
  firstSeenAt: timestamp(1_000),
}

const NEWER_LOT: RestockLot = {
  id: '1011500',
  title: 'Bosch cordless tool set',
  category: 'Tools',
  units: 12,
  condition: 'Brand New',
  msrp: 599,
  price: 320,
  costPerUnit: 26.67,
  vendor: 'Bosch',
  warehouse: 'ON1',
  productUrl: 'https://restock.ca/lot/1011500',
  imageUrl: null,
  manifestUrl: 'https://restock.ca/lot/1011500/manifest.pdf',
  firstSeenAt: timestamp(2_000),
}

function renderPage(role: Role | null = 'buyer') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authState: AuthState = {
    user: {} as User,
    tenantId: role ? 'tenant-a' : null,
    role,
    loading: false,
    refreshClaims: () => Promise.resolve(),
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <MemoryRouter>
          <DiscoveredLotsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('DiscoveredLotsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listDismissedLotIds.mockResolvedValue(new Set())
    listDiscoveredLotImports.mockResolvedValue(new Map())
  })

  it('shows an empty state when there are no discovered lots', async () => {
    listActiveRestockLots.mockResolvedValueOnce([])
    renderPage()

    expect(
      await screen.findByText('No discovered lots yet - check back after the next scrape.'),
    ).toBeInTheDocument()
  })

  it('renders lot details, sorted newest-discovered first', async () => {
    listActiveRestockLots.mockResolvedValueOnce([OLDER_LOT, NEWER_LOT])
    renderPage()

    await screen.findByText('Bosch cordless tool set')
    const rows = screen.getAllByRole('row')
    // rows[0] is the header row.
    expect(rows[1]).toHaveTextContent('Bosch cordless tool set')
    expect(rows[2]).toHaveTextContent('Staples Canada stacking chairs')

    expect(screen.getByText('$599.00')).toBeInTheDocument()
    expect(screen.getByText('$320.00')).toBeInTheDocument()
    expect(screen.getByLabelText('Manifest for Bosch cordless tool set')).toBeInTheDocument()
  })

  it('filters by category', async () => {
    listActiveRestockLots.mockResolvedValueOnce([OLDER_LOT, NEWER_LOT])
    renderPage()

    await screen.findByText('Bosch cordless tool set')

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Furniture' } })

    expect(screen.getByText('Staples Canada stacking chairs')).toBeInTheDocument()
    expect(screen.queryByText('Bosch cordless tool set')).not.toBeInTheDocument()
  })

  it('shows a category-scoped empty message when a filter matches nothing', async () => {
    listActiveRestockLots.mockResolvedValueOnce([OLDER_LOT])
    renderPage()

    await screen.findByText('Staples Canada stacking chairs')
    expect(screen.queryByText('No lots in this category right now.')).not.toBeInTheDocument()
  })

  it('hides Import/Remove actions for a read-only role (e.g. warehouse)', async () => {
    listActiveRestockLots.mockResolvedValueOnce([NEWER_LOT])
    renderPage('warehouse')

    await screen.findByText('Bosch cordless tool set')
    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Remove/)).not.toBeInTheDocument()
  })

  it('a buyer can import a lot, and it moves to "Importing…" once queued', async () => {
    listActiveRestockLots.mockResolvedValueOnce([NEWER_LOT])
    enqueueDiscoveredLotImport.mockResolvedValueOnce({ importId: 'import-1' })
    renderPage('buyer')

    await screen.findByText('Bosch cordless tool set')
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))

    await waitFor(() => {
      expect(enqueueDiscoveredLotImport).toHaveBeenCalledWith('1011500')
    })
  })

  it('shows an "Imported" link to the manifest detail page once completed', async () => {
    listActiveRestockLots.mockResolvedValueOnce([NEWER_LOT])
    listDiscoveredLotImports.mockResolvedValue(
      new Map([
        [
          '1011500',
          {
            id: 'import-1',
            vendorId: 'restock-ca',
            format: 'csv',
            fileName: 'restock-lot-1011500.csv',
            status: 'completed',
            rowCount: 5,
            successCount: 5,
            errorCount: 0,
            error: null,
            freightCost: 0,
            otherFees: 0,
            totalPurchasePrice: 320,
            sourceRestockLotId: '1011500',
          },
        ],
      ]),
    )
    renderPage('buyer')

    const link = await screen.findByRole('link', { name: 'Imported' })
    expect(link).toHaveAttribute('href', '/manifests/import-1')
  })

  it('shows a "Try again" button and a failure note when a prior import failed', async () => {
    listActiveRestockLots.mockResolvedValueOnce([NEWER_LOT])
    listDiscoveredLotImports.mockResolvedValue(
      new Map([
        [
          '1011500',
          {
            id: 'import-1',
            vendorId: 'restock-ca',
            format: 'csv',
            fileName: 'restock-lot-1011500.csv',
            status: 'failed',
            rowCount: 0,
            successCount: 0,
            errorCount: 0,
            error: 'Manifest not available in a supported format (CSV or XLSX required).',
            freightCost: 0,
            otherFees: 0,
            totalPurchasePrice: 320,
            sourceRestockLotId: '1011500',
          },
        ],
      ]),
    )
    renderPage('buyer')

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByText('Import failed')).toBeInTheDocument()
  })

  it('a buyer can dismiss a lot and it disappears from the list', async () => {
    listActiveRestockLots.mockResolvedValueOnce([OLDER_LOT, NEWER_LOT])
    dismissLot.mockResolvedValueOnce(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage('buyer')

    await screen.findByText('Bosch cordless tool set')
    fireEvent.click(screen.getByLabelText('Remove Bosch cordless tool set'))

    await waitFor(() => {
      expect(dismissLot).toHaveBeenCalledWith('tenant-a', '1011500')
    })
  })
})

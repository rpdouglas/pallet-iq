import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { InventoryItem } from '../types/inventory'

const listInventory = vi.fn<(tenantId: string) => Promise<InventoryItem[]>>()
const updateInventoryStatus =
  vi.fn<(tenantId: string, inventoryId: string, status: string) => Promise<void>>()
vi.mock('../lib/inventory/inventoryActions', () => ({ listInventory, updateInventoryStatus }))

const { InventoryPage } = await import('./InventoryPage')

const PURCHASED_ITEM: InventoryItem = {
  id: 'inv-1',
  lineItemId: 'line-1',
  manifestId: 'import-1',
  vendorId: 'vendor-1',
  sku: 'SKU-1',
  upc: null,
  description: 'Widget',
  quantity: 10,
  unitCost: 4.5,
  condition: 'New',
  category: null,
  status: 'purchased',
}

const SOLD_ITEM: InventoryItem = { ...PURCHASED_ITEM, id: 'inv-2', status: 'sold' }

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
          <InventoryPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there is no inventory yet', async () => {
    listInventory.mockResolvedValueOnce([])
    renderPage('owner')

    expect(await screen.findByText(/No inventory yet/)).toBeInTheDocument()
  })

  it('renders inventory rows with cost visible for an owner', async () => {
    listInventory.mockResolvedValueOnce([PURCHASED_ITEM])
    renderPage('owner')

    expect(await screen.findByText('Widget')).toBeInTheDocument()
    expect(screen.getByText('SKU-1')).toBeInTheDocument()
    expect(screen.getByText('$4.50')).toBeInTheDocument()
    expect(screen.getByText('Purchased')).toBeInTheDocument()
  })

  it('hides the unit cost column for a warehouse user', async () => {
    listInventory.mockResolvedValueOnce([PURCHASED_ITEM])
    renderPage('warehouse')

    expect(await screen.findByText('Widget')).toBeInTheDocument()
    expect(screen.queryByText('$4.50')).not.toBeInTheDocument()
  })

  it('lets a warehouse user advance an item to the next status', async () => {
    listInventory.mockResolvedValueOnce([PURCHASED_ITEM])
    updateInventoryStatus.mockResolvedValueOnce(undefined)
    renderPage('warehouse')

    fireEvent.click(await screen.findByRole('button', { name: 'Mark Received' }))

    await waitFor(() => {
      expect(updateInventoryStatus).toHaveBeenCalledWith('tenant-a', 'inv-1', 'received')
    })
  })

  it('does not show an advance action for a buyer (read-only)', async () => {
    listInventory.mockResolvedValueOnce([PURCHASED_ITEM])
    renderPage('buyer')

    expect(await screen.findByText('Widget')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mark/ })).not.toBeInTheDocument()
  })

  it('shows no advance action once an item is sold', async () => {
    listInventory.mockResolvedValueOnce([SOLD_ITEM])
    renderPage('manager')

    expect(await screen.findByText('Sold')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mark/ })).not.toBeInTheDocument()
  })
})

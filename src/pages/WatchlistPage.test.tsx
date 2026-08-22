import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { WatchlistLot } from '../types/watchlistLot'

const listWatchlistLots = vi.fn<(tenantId: string) => Promise<WatchlistLot[]>>()
const createWatchlistLot = vi.fn<(...args: unknown[]) => Promise<void>>()
const deleteWatchlistLot = vi.fn<(...args: unknown[]) => Promise<void>>()
vi.mock('../lib/watchlist/watchlistActions', () => ({
  listWatchlistLots,
  createWatchlistLot,
  deleteWatchlistLot,
}))

const { WatchlistPage } = await import('./WatchlistPage')

const LOT: WatchlistLot = {
  id: 'lot-1',
  title: 'Pallet of returned electronics',
  source: 'bstock',
  category: 'Electronics',
  units: 42,
  currentBid: 250,
  closesAt: '2026-09-01T18:00:00.000Z',
  productUrl: 'https://bstock.example/lot/123',
  notes: '',
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
          <WatchlistPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('WatchlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state with an add action for a buyer when there are no lots', async () => {
    listWatchlistLots.mockResolvedValueOnce([])
    renderPage('buyer')

    expect(await screen.findByText('No watchlist lots yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first lot' })).toBeInTheDocument()
  })

  it('shows an empty state with no action for a warehouse-role user (read-only)', async () => {
    listWatchlistLots.mockResolvedValueOnce([])
    renderPage('warehouse')

    expect(await screen.findByText('No watchlist lots yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
  })

  it('renders lot details and a remove action for an owner', async () => {
    listWatchlistLots.mockResolvedValueOnce([LOT])
    renderPage('owner')

    expect(await screen.findByText('Pallet of returned electronics')).toBeInTheDocument()
    expect(screen.getByText('B-Stock')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Pallet of returned electronics' }),
    ).toBeInTheDocument()
  })

  it('omits the remove action for a manager (read-only, not owner/buyer)', async () => {
    listWatchlistLots.mockResolvedValueOnce([LOT])
    renderPage('manager')

    expect(await screen.findByText('Pallet of returned electronics')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('lets a buyer add a lot', async () => {
    listWatchlistLots.mockResolvedValueOnce([])
    createWatchlistLot.mockResolvedValueOnce(undefined)
    renderPage('buyer')

    fireEvent.click(await screen.findByRole('button', { name: 'Add your first lot' }))
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Pallet of returned electronics' },
    })
    fireEvent.change(screen.getByLabelText('Listing URL'), {
      target: { value: 'https://bstock.example/lot/123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add lot' }))

    await waitFor(() => {
      expect(createWatchlistLot).toHaveBeenCalledWith('tenant-a', {
        title: 'Pallet of returned electronics',
        source: 'bstock',
        category: '',
        units: undefined,
        currentBid: undefined,
        closesAt: undefined,
        productUrl: 'https://bstock.example/lot/123',
        notes: '',
      })
    })
  })

  it('lets an owner remove a lot after confirming', async () => {
    listWatchlistLots.mockResolvedValueOnce([LOT])
    deleteWatchlistLot.mockResolvedValueOnce(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage('owner')

    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove Pallet of returned electronics' }),
    )

    await waitFor(() => {
      expect(deleteWatchlistLot).toHaveBeenCalledWith('tenant-a', 'lot-1')
    })
  })

  it('does not remove a lot when the confirmation is declined', async () => {
    listWatchlistLots.mockResolvedValueOnce([LOT])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage('owner')

    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove Pallet of returned electronics' }),
    )

    expect(deleteWatchlistLot).not.toHaveBeenCalled()
  })

  it('sorts lots by closest closing time first, with no-closesAt lots last', async () => {
    const closesSoon: WatchlistLot = {
      ...LOT,
      id: 'lot-soon',
      title: 'Closes soon',
      closesAt: '2026-08-23T00:00:00.000Z',
    }
    const closesLater: WatchlistLot = {
      ...LOT,
      id: 'lot-later',
      title: 'Closes later',
      closesAt: '2026-09-15T00:00:00.000Z',
    }
    const noClose: WatchlistLot = { ...LOT, id: 'lot-none', title: 'No close date', closesAt: null }
    listWatchlistLots.mockResolvedValueOnce([closesLater, noClose, closesSoon])
    renderPage('owner')

    const rows = await screen.findAllByRole('row')
    const titles = rows.slice(1).map((row) => row.textContent)
    expect(titles[0]).toContain('Closes soon')
    expect(titles[1]).toContain('Closes later')
    expect(titles[2]).toContain('No close date')
  })
})

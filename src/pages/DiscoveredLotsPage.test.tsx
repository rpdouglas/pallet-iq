import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RestockLot } from '../types/restockLot'

const listActiveRestockLots = vi.fn<() => Promise<RestockLot[]>>()
vi.mock('../lib/restockLots/restockLotsActions', () => ({ listActiveRestockLots }))

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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DiscoveredLotsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DiscoveredLotsPage', () => {
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
})

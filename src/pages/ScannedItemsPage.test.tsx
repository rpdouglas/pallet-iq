import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { ItemScan } from '../types/itemScan'

const listPricedItemScans = vi.fn<() => Promise<ItemScan[]>>()
const enqueueListingCopy = vi.fn<(...args: unknown[]) => Promise<void>>()
vi.mock('../lib/itemScans/itemScanActions', () => ({ listPricedItemScans, enqueueListingCopy }))

const { ScannedItemsPage } = await import('./ScannedItemsPage')

const CANDIDATE = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: null,
  notableFeatures: null,
  condition: 'good' as const,
  conditionJustification: 'Light wear.',
  confidence: 0.9,
  barcodeNumber: null,
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

function scan(overrides: Partial<ItemScan> = {}): ItemScan {
  return {
    id: 'scan-1',
    status: 'completed',
    photoPaths: [],
    candidates: [CANDIDATE],
    selectedCandidateIndex: 0,
    error: null,
    pricingStatus: 'priced',
    pricing: {
      msrp: 100,
      salePrice: 55,
      salePriceLow: 45,
      salePriceHigh: 65,
      liquidationPrice: 30,
      confidence: 0.7,
      sampleSize: 4,
      factors: [],
      comps: [],
      waterfallStepsUsed: [],
    },
    pricingError: null,
    saleabilityStatus: 'scored',
    saleabilityScore: { score: 0.7, factors: [] },
    saleabilityError: null,
    listingCopyStatus: 'not_generated',
    listingCopy: null,
    listingCopyError: null,
    ...overrides,
  }
}

function renderPage(role: Role = 'manager') {
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
          <ScannedItemsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('ScannedItemsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no priced scans', async () => {
    listPricedItemScans.mockResolvedValueOnce([])
    renderPage()

    expect(await screen.findByText(/no priced scans yet/i)).toBeInTheDocument()
  })

  it('renders a priced scan with a "Generate listing copy" action', async () => {
    listPricedItemScans.mockResolvedValueOnce([scan()])
    renderPage()

    expect(await screen.findByText('Instant Pot Duo 6-Quart')).toBeInTheDocument()
    expect(screen.getByText('Kitchen Appliances')).toBeInTheDocument()
    expect(screen.getByText('$55.00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate listing copy' })).toBeInTheDocument()
  })

  it('shows a spinner while listing copy is generating', async () => {
    listPricedItemScans.mockResolvedValueOnce([scan({ listingCopyStatus: 'generating' })])
    renderPage()

    expect(await screen.findByText(/generating/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows a "Try again" action when generation previously failed', async () => {
    listPricedItemScans.mockResolvedValueOnce([
      scan({ listingCopyStatus: 'failed', listingCopyError: 'Gemini timed out' }),
    ])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('triggers enqueueListingCopy when "Generate listing copy" is clicked', async () => {
    // Persistent, not Once - the mutation's onSuccess invalidates the
    // query, triggering a second real call to listPricedItemScans.
    listPricedItemScans.mockResolvedValue([scan()])
    enqueueListingCopy.mockResolvedValueOnce(undefined)
    renderPage()

    // Wait for the button to appear, then re-query it fresh right before
    // clicking - a background refetch can re-render the table between the
    // two, leaving an earlier reference to a now-detached DOM node.
    fireEvent.click(await screen.findByRole('button', { name: 'Generate listing copy' }))

    await waitFor(() => {
      expect(enqueueListingCopy).toHaveBeenCalledWith('scan-1')
    })
  })

  it('shows a "View / edit" action and the generated draft for an already-generated scan', async () => {
    listPricedItemScans.mockResolvedValueOnce([
      scan({
        listingCopyStatus: 'generated',
        listingCopy: {
          title: 'Instant Pot Duo 6-Quart - Good Condition',
          description: 'A well-used Instant Pot with light wear.',
        },
      }),
    ])
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'View / edit' }))

    expect(screen.getByDisplayValue('Instant Pot Duo 6-Quart - Good Condition')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A well-used Instant Pot with light wear.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument()
  })
})

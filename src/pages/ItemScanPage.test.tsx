import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type {
  ItemScan,
  ItemScanCandidate,
  PricingResult,
  SaleabilityResult,
} from '../types/itemScan'

const newScanId = vi.fn<(tenantId: string) => string>()
const uploadScanPhoto =
  vi.fn<
    (
      tenantId: string,
      scanId: string,
      index: number,
      file: File,
    ) => Promise<{ storagePath: string }>
  >()
const enqueueItemScan =
  vi.fn<(params: { scanId: string; photoPaths: string[] }) => Promise<{ scanId: string }>>()
const getItemScan = vi.fn<(tenantId: string, scanId: string) => Promise<ItemScan | null>>()
const selectItemScanCandidate =
  vi.fn<(tenantId: string, scanId: string, candidateIndex: number) => Promise<void>>()
const priceItemScan = vi.fn<(scanId: string) => Promise<void>>()
const retrySaleabilityScore = vi.fn<(scanId: string) => Promise<void>>()
vi.mock('../lib/itemScans/itemScanActions', () => ({
  newScanId,
  uploadScanPhoto,
  enqueueItemScan,
  getItemScan,
  selectItemScanCandidate,
  priceItemScan,
  retrySaleabilityScore,
}))

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:fake')
})

const { ItemScanPage } = await import('./ItemScanPage')

function photoFile(name = 'photo.jpg') {
  return new File(['bytes'], name, { type: 'image/jpeg' })
}

function fileInput() {
  return screen.getByLabelText<HTMLInputElement>('Choose from device')
}

function selectFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

function renderPage(role: Role = 'buyer') {
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
          <ItemScanPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

const CANDIDATE: ItemScanCandidate = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: '13x12x13 in',
  notableFeatures: null,
  condition: 'good',
  conditionJustification: 'Minor scuffing on lid.',
  confidence: 0.92,
  barcodeNumber: null,
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

const PRICING: PricingResult = {
  msrp: 100,
  salePrice: 70,
  salePriceLow: 60,
  salePriceHigh: 80,
  liquidationPrice: 30,
  confidence: 0.7,
  sampleSize: 5,
  factors: [{ label: 'Condition: good', direction: 'neutral', explanation: null }],
  comps: [],
  waterfallStepsUsed: ['ebay'],
}

const SALEABILITY: SaleabilityResult = {
  score: 0.72,
  factors: [
    { label: 'Sell-through rate not available yet', direction: 'neutral', explanation: null },
  ],
}

// Base fixture - every test overrides only the fields it cares about,
// rather than repeating all 12 ItemScan fields each time.
function baseScan(overrides: Partial<ItemScan> = {}): ItemScan {
  return {
    id: 'scan-1',
    status: 'completed',
    photoPaths: [],
    candidates: [CANDIDATE],
    selectedCandidateIndex: 0,
    error: null,
    pricingStatus: 'not_priced',
    pricing: null,
    pricingError: null,
    saleabilityStatus: 'not_scored',
    saleabilityScore: null,
    saleabilityError: null,
    ...overrides,
  }
}

describe('ItemScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    priceItemScan.mockResolvedValue(undefined)
    retrySaleabilityScore.mockResolvedValue(undefined)
  })

  it('uploads photos and enqueues a scan', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(
      baseScan({ status: 'processing', candidates: [], selectedCandidateIndex: null }),
    )
    renderPage()

    const file = photoFile()
    selectFiles(fileInput(), [file])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    await waitFor(() => {
      expect(enqueueItemScan).toHaveBeenCalledWith({
        scanId: 'scan-1',
        photoPaths: ['tenants/tenant-a/item_scans/scan-1/photo-0.jpg'],
      })
    })
    expect(uploadScanPhoto).toHaveBeenCalledWith('tenant-a', 'scan-1', 0, file)
    expect(await screen.findByText(/identifying item/i)).toBeInTheDocument()
    expect(screen.getByText('Usually takes under a minute.')).toBeInTheDocument()
  })

  it('shows expectation-setting copy while pricing', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    let resolvePricing: () => void = () => {
      // reassigned below before use
    }
    priceItemScan.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolvePricing = resolve
      }),
    )
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Pricing…')).toBeInTheDocument()
    expect(screen.getByText(/checking retail, kijiji, and ebay listings live/i)).toBeInTheDocument()

    resolvePricing()
  })

  it('shows a reassurance message once identification takes longer than usual', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      newScanId.mockReturnValueOnce('scan-1')
      uploadScanPhoto.mockResolvedValueOnce({
        storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
      })
      enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
      getItemScan.mockResolvedValue(
        baseScan({ status: 'processing', candidates: [], selectedCandidateIndex: null }),
      )
      renderPage()

      selectFiles(fileInput(), [photoFile()])
      fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

      expect(await screen.findByText(/identifying item/i)).toBeInTheDocument()
      expect(screen.queryByText(/taking longer than usual/i)).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(90_000)
      })

      expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
      // mockResolvedValue (not ...Once) sets a persistent implementation
      // that vi.clearAllMocks() in the next test's beforeEach won't clear -
      // reset it explicitly so later tests get their own clean queue.
      getItemScan.mockReset()
    }
  })

  it('shows the completed candidate when confidence auto-resolved', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Instant Pot Duo 6-Quart')).toBeInTheDocument()
    expect(screen.getByText('92% confident')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scan another item/i })).toBeInTheDocument()
  })

  it('auto-starts pricing once a candidate is confirmed, and shows the priced panel', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    getItemScan.mockResolvedValueOnce(
      baseScan({ pricingStatus: 'priced', pricing: PRICING, saleabilityStatus: 'scoring' }),
    )
    priceItemScan.mockResolvedValueOnce(undefined)
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    await waitFor(() => {
      expect(priceItemScan).toHaveBeenCalledWith('scan-1')
    })
    expect(await screen.findByText('$70.00')).toBeInTheDocument()
    expect(screen.getByText('70% confidence')).toBeInTheDocument()
  })

  it('shows the "not enough data" empty state when pricing finds nothing', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    getItemScan.mockResolvedValueOnce(
      baseScan({ pricingStatus: 'unknown', saleabilityStatus: 'scoring' }),
    )
    priceItemScan.mockResolvedValueOnce(undefined)
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Not enough data to price this item yet.')).toBeInTheDocument()
  })

  it('shows a pricing failure message and lets the buyer retry pricing', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    getItemScan.mockResolvedValueOnce(
      baseScan({ pricingStatus: 'failed', pricingError: 'eBay is down' }),
    )
    priceItemScan.mockResolvedValueOnce(undefined)
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('eBay is down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try pricing again/i })).toBeInTheDocument()
  })

  it('shows the saleability panel once background scoring completes', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    // The intermediate "scoring" poll tick isn't simulated here (it needs
    // real elapsed time via refetchInterval, not worth faking timers for) -
    // this asserts the settled 'scored' state renders correctly, same
    // two-stage pattern as the "auto-starts pricing" test above.
    getItemScan.mockResolvedValueOnce(
      baseScan({
        pricingStatus: 'priced',
        pricing: PRICING,
        saleabilityStatus: 'scored',
        saleabilityScore: SALEABILITY,
      }),
    )
    priceItemScan.mockResolvedValueOnce(undefined)
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('72')).toBeInTheDocument()
    expect(screen.getByText('Saleability score')).toBeInTheDocument()
    expect(screen.getByText('Sell-through rate not available yet')).toBeInTheDocument()
  })

  it('shows a saleability failure message and lets the buyer retry', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(baseScan())
    getItemScan.mockResolvedValueOnce(
      baseScan({
        pricingStatus: 'priced',
        pricing: PRICING,
        saleabilityStatus: 'failed',
        saleabilityError: 'Keepa is down',
      }),
    )
    // Re-fetched after retrySaleabilityScore's onSuccess invalidates the query.
    getItemScan.mockResolvedValueOnce(
      baseScan({ pricingStatus: 'priced', pricing: PRICING, saleabilityStatus: 'scoring' }),
    )
    priceItemScan.mockResolvedValueOnce(undefined)
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Keepa is down')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    await waitFor(() => {
      expect(retrySaleabilityScore).toHaveBeenCalledWith('scan-1')
    })
    // priceItemScan was only called once, by the initial auto-price effect -
    // the saleability-only retry must not trigger a second, full waterfall re-run.
    expect(priceItemScan).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/scoring saleability/i)).toBeInTheDocument()
  })

  it('shows a top-3 picker when confidence is low, and selects a candidate', async () => {
    const lowA = { ...CANDIDATE, itemName: 'Mystery A', confidence: 0.4 }
    const lowB = { ...CANDIDATE, itemName: 'Mystery B', confidence: 0.3 }
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(
      baseScan({ candidates: [lowA, lowB], selectedCandidateIndex: null }),
    )
    selectItemScanCandidate.mockResolvedValueOnce(undefined)
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Mystery A')).toBeInTheDocument()
    expect(screen.getByText('Mystery B')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Mystery A'))

    await waitFor(() => {
      expect(selectItemScanCandidate).toHaveBeenCalledWith('tenant-a', 'scan-1', 0)
    })
  })

  it('shows a failure message and lets the buyer try again', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce(
      baseScan({
        status: 'failed',
        candidates: [],
        selectedCandidateIndex: null,
        error: 'Gemini returned an empty response.',
      }),
    )
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Gemini returned an empty response.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(fileInput()).toBeInTheDocument()
  })
})

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { ItemScan, ItemScanCandidate } from '../types/itemScan'

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
vi.mock('../lib/itemScans/itemScanActions', () => ({
  newScanId,
  uploadScanPhoto,
  enqueueItemScan,
  getItemScan,
  selectItemScanCandidate,
}))

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:fake')
})

const { ItemScanPage } = await import('./ItemScanPage')

function photoFile(name = 'photo.jpg') {
  return new File(['bytes'], name, { type: 'image/jpeg' })
}

function fileInput() {
  return screen.getByLabelText<HTMLInputElement>('Add photo')
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
}

describe('ItemScanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads photos and enqueues a scan', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce({
      id: 'scan-1',
      status: 'processing',
      photoPaths: [],
      candidates: [],
      selectedCandidateIndex: null,
      error: null,
    })
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
  })

  it('shows the completed candidate when confidence auto-resolved', async () => {
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce({
      id: 'scan-1',
      status: 'completed',
      photoPaths: [],
      candidates: [CANDIDATE],
      selectedCandidateIndex: 0,
      error: null,
    })
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Instant Pot Duo 6-Quart')).toBeInTheDocument()
    expect(screen.getByText('92% confident')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scan another item/i })).toBeInTheDocument()
  })

  it('shows a top-3 picker when confidence is low, and selects a candidate', async () => {
    const lowA = { ...CANDIDATE, itemName: 'Mystery A', confidence: 0.4 }
    const lowB = { ...CANDIDATE, itemName: 'Mystery B', confidence: 0.3 }
    newScanId.mockReturnValueOnce('scan-1')
    uploadScanPhoto.mockResolvedValueOnce({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
    })
    enqueueItemScan.mockResolvedValueOnce({ scanId: 'scan-1' })
    getItemScan.mockResolvedValueOnce({
      id: 'scan-1',
      status: 'completed',
      photoPaths: [],
      candidates: [lowA, lowB],
      selectedCandidateIndex: null,
      error: null,
    })
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
    getItemScan.mockResolvedValueOnce({
      id: 'scan-1',
      status: 'failed',
      photoPaths: [],
      candidates: [],
      selectedCandidateIndex: null,
      error: 'Gemini returned an empty response.',
    })
    renderPage()

    selectFiles(fileInput(), [photoFile()])
    fireEvent.click(screen.getByRole('button', { name: /identify item/i }))

    expect(await screen.findByText('Gemini returned an empty response.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(fileInput()).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { ItemScanDoc } from './types'

const mockUpdate = vi.fn()
const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet, update: mockUpdate }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockGenerateListingCopy = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('../listing-copy/generateListingCopy', () => ({
  generateListingCopy: mockGenerateListingCopy,
}))

vi.mock('../gemini/params', () => ({ geminiApiKey: { value: () => 'fake-key' } }))

const { listingCopyWorker } = await import('./listingCopyWorker')

function request(data: unknown) {
  return { data } as never
}

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

const PRICING = { msrp: 100, salePrice: 55 }
const SALEABILITY_SCORE = { score: 0.7, factors: [] }

const PRICED_AND_SCORED_SCAN = {
  selectedCandidateIndex: 0,
  candidates: [CANDIDATE],
  pricing: PRICING,
  saleabilityScore: SALEABILITY_SCORE,
}

const LISTING_COPY = {
  title: 'Instant Pot Duo 6-Quart - Good Condition',
  description: 'A well-used Instant Pot with light wear.',
}

function resetMocks() {
  mockUpdate.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
  mockGenerateListingCopy.mockReset()
}

describe('listingCopyWorker', () => {
  it('logs and returns early on an invalid payload rather than throwing', async () => {
    resetMocks()
    await expect(listingCopyWorker.run(request({}))).resolves.toBeUndefined()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('marks the scan failed and rethrows when there is no confirmed candidate', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ selectedCandidateIndex: null }) })

    await expect(
      listingCopyWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow(/priced, scored candidate/i)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ listingCopyStatus: 'failed' }),
    )
  })

  it('marks the scan failed and rethrows when pricing is missing', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ ...PRICED_AND_SCORED_SCAN, pricing: null }),
    })

    await expect(
      listingCopyWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow(/priced, scored candidate/i)
  })

  it('marks the scan failed and rethrows when saleabilityScore is missing', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ ...PRICED_AND_SCORED_SCAN, saleabilityScore: null }),
    })

    await expect(
      listingCopyWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow(/priced, scored candidate/i)
  })

  it('generates listing copy and writes it to the scan doc', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => PRICED_AND_SCORED_SCAN })
    mockGenerateListingCopy.mockResolvedValueOnce(LISTING_COPY)

    await listingCopyWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' }))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/s1')
    expect(mockGenerateListingCopy).toHaveBeenCalledWith(
      'fake-key',
      CANDIDATE,
      PRICING,
      SALEABILITY_SCORE,
    )

    const updateArg = mockUpdate.mock.calls[0][0] as Partial<ItemScanDoc>
    expect(updateArg.listingCopyStatus).toBe('generated')
    expect(updateArg.listingCopy).toEqual(LISTING_COPY)
  })

  it('marks the scan failed and rethrows when the Gemini call fails', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => PRICED_AND_SCORED_SCAN })
    mockGenerateListingCopy.mockRejectedValueOnce(new Error('Gemini timed out'))

    await expect(
      listingCopyWorker.run(request({ tenantId: 'tenant-a', scanId: 's1' })),
    ).rejects.toThrow('Gemini timed out')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        listingCopyStatus: 'failed',
        listingCopyError: 'Gemini timed out',
      }),
    )
  })
})

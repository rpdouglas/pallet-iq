import { describe, expect, it, vi } from 'vitest'
import type { KwickstockLotDoc, ParsedLot } from './types'

const mockBatchSet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()
const mockBatch = vi.fn(() => ({
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
}))

interface FakeDoc {
  id: string
  ref: { id: string }
  data: () => Partial<KwickstockLotDoc>
}

let existingDocs: FakeDoc[] = []
const mockCollectionGet = vi.fn(() => Promise.resolve({ docs: existingDocs }))
const mockDoc = vi.fn((id: string) => ({ id }))
const mockCollection = vi.fn(() => ({ doc: mockDoc, get: mockCollectionGet }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mockCollection, batch: mockBatch }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const mockParseLotListPage = vi.fn()
vi.mock('./parseLotListPage', () => ({ parseLotListPage: mockParseLotListPage }))

const { scrapeKwickstockLots } = await import('./scrapeKwickstockLots')

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function lot(overrides: Partial<ParsedLot> = {}): ParsedLot {
  return {
    lotId: 'test-lot',
    title: 'Test Lot',
    category: 'General Merchandise',
    units: 100,
    condition: 'New',
    pricePerUnit: 5,
    totalPrice: 500,
    vendor: 'KwickStock',
    location: 'Montréal',
    productUrl: 'https://kwickstock.ca/en/product/test-lot',
    imageUrl: null,
    ...overrides,
  }
}

function fakeDoc(id: string, status: KwickstockLotDoc['status']): FakeDoc {
  return { id, ref: { id }, data: () => ({ status }) }
}

function pageResponse(ok: boolean, status = 200) {
  return { ok, status, text: () => Promise.resolve('<html></html>') }
}

function resetMocks() {
  mockBatchSet.mockClear()
  mockBatchUpdate.mockClear()
  mockBatchCommit.mockClear()
  mockBatch.mockClear()
  mockCollectionGet.mockClear()
  mockDoc.mockClear()
  mockCollection.mockClear()
  mockParseLotListPage.mockReset()
  mockFetch.mockReset()
  existingDocs = []
}

describe('scrapeKwickstockLots', () => {
  it('creates a new lot', async () => {
    resetMocks()
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeKwickstockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockBatchSet).toHaveBeenCalledTimes(1)
    expect(mockBatchUpdate).not.toHaveBeenCalled()
    const [ref, doc] = mockBatchSet.mock.calls[0] as [{ id: string }, KwickstockLotDoc]
    expect(ref.id).toBe('test-lot')
    expect(doc).toEqual(expect.objectContaining({ lotId: 'test-lot', status: 'active' }))
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })

  it('updates an existing lot', async () => {
    resetMocks()
    existingDocs = [fakeDoc('test-lot', 'active')]
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeKwickstockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1)
    const [ref, doc] = mockBatchUpdate.mock.calls[0] as [{ id: string }, Partial<KwickstockLotDoc>]
    expect(ref.id).toBe('test-lot')
    expect(doc).toEqual(expect.objectContaining({ status: 'active' }))
  })

  it('closes a previously-active lot that no longer appears in the scrape', async () => {
    resetMocks()
    existingDocs = [fakeDoc('test-lot', 'active'), fakeDoc('gone-lot', 'active')]
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeKwickstockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
    const closeCall = mockBatchUpdate.mock.calls.find(
      (call) => (call[0] as { id: string }).id === 'gone-lot',
    ) as [{ id: string }, Partial<KwickstockLotDoc>]
    expect(closeCall[1]).toEqual(expect.objectContaining({ status: 'closed' }))
  })

  it('does not re-close an already-closed lot that stays absent', async () => {
    resetMocks()
    existingDocs = [fakeDoc('gone-lot', 'closed')]
    mockParseLotListPage.mockReturnValueOnce({ lots: [], unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeKwickstockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })

  it('stops on a non-ok response instead of throwing, without calling the parser', async () => {
    resetMocks()
    mockFetch.mockResolvedValueOnce(pageResponse(false, 503))

    await expect(
      scrapeKwickstockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' }),
    ).resolves.not.toThrow()

    expect(mockParseLotListPage).not.toHaveBeenCalled()
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })
})

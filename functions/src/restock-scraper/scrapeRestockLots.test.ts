import { describe, expect, it, vi } from 'vitest'
import type { ParsedLot, RestockLotDoc } from './types'

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
  data: () => Partial<RestockLotDoc>
}

let existingDocs: FakeDoc[] = []
const mockCollectionGet = vi.fn(() => Promise.resolve({ docs: existingDocs }))
let subDocCounter = 0
const mockSubDoc = vi.fn(() => ({ id: `sub-${(subDocCounter++).toString()}` }))
const mockSubCollection = vi.fn(() => ({ doc: mockSubDoc }))
const mockDoc = vi.fn((id: string) => ({ id, collection: mockSubCollection }))
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

const mockExtractManifestTable = vi.fn()
vi.mock('./extractManifestTable', () => ({ extractManifestTable: mockExtractManifestTable }))

const { scrapeRestockLots } = await import('./scrapeRestockLots')

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function lot(overrides: Partial<ParsedLot> = {}): ParsedLot {
  return {
    lotNumber: '1000001',
    title: '1 unit of Widgets - MSRP $10 - Brand New (Lot # 1000001)',
    category: 'Widgets',
    units: 1,
    condition: 'Brand New',
    msrp: 10,
    price: 5,
    costPerUnit: 5,
    vendor: 'Test Vendor',
    warehouse: 'Test Warehouse',
    productUrl: 'https://www.restock.ca/1000001/',
    imageUrl: null,
    ...overrides,
  }
}

function fakeDoc(id: string, status: RestockLotDoc['status']): FakeDoc {
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
  mockSubDoc.mockClear()
  mockSubCollection.mockClear()
  mockCollection.mockClear()
  mockParseLotListPage.mockReset()
  mockExtractManifestTable.mockReset()
  mockFetch.mockReset()
  existingDocs = []
  subDocCounter = 0
}

describe('scrapeRestockLots', () => {
  it('creates a new lot, fetching and storing its manifest table', async () => {
    resetMocks()
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], totalPages: 1, unparsedCount: 0 })
    mockFetch
      .mockResolvedValueOnce(pageResponse(true)) // category page
      .mockResolvedValueOnce(pageResponse(true)) // manifest-table detail-page fetch
    mockExtractManifestTable.mockReturnValueOnce([{ UPC: '123', QTY: '1', TITLE: 'Widget' }])

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockExtractManifestTable).toHaveBeenCalledTimes(1)
    // one set for the lot doc, one for the single manifest item
    expect(mockBatchSet).toHaveBeenCalledTimes(2)
    expect(mockBatchUpdate).not.toHaveBeenCalled()
    const [ref, doc] = mockBatchSet.mock.calls[0] as [{ id: string }, RestockLotDoc]
    expect(ref.id).toBe('1000001')
    expect(doc).toEqual(
      expect.objectContaining({
        lotNumber: '1000001',
        hasManifest: true,
        status: 'active',
      }),
    )
    const [, itemDoc] = mockBatchSet.mock.calls[1] as [unknown, Record<string, string>]
    expect(itemDoc).toEqual({ UPC: '123', QTY: '1', TITLE: 'Widget' })
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)
  })

  it('updates an existing lot without re-fetching its manifest table', async () => {
    resetMocks()
    existingDocs = [fakeDoc('1000001', 'active')]
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], totalPages: 1, unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockExtractManifestTable).not.toHaveBeenCalled()
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(mockBatchUpdate).toHaveBeenCalledTimes(1)
    const [ref, doc] = mockBatchUpdate.mock.calls[0] as [{ id: string }, Partial<RestockLotDoc>]
    expect(ref.id).toBe('1000001')
    expect(doc).toEqual(expect.objectContaining({ status: 'active' }))
    expect(doc).not.toHaveProperty('hasManifest')
  })

  it('closes a previously-active lot that no longer appears in the scrape', async () => {
    resetMocks()
    existingDocs = [fakeDoc('1000001', 'active'), fakeDoc('2000002', 'active')]
    mockParseLotListPage.mockReturnValueOnce({
      lots: [lot({ lotNumber: '1000001' })],
      totalPages: 1,
      unparsedCount: 0,
    })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    // one update for the still-active lot, one to close the vanished lot
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2)
    const closeCall = mockBatchUpdate.mock.calls.find(
      (call) => (call[0] as { id: string }).id === '2000002',
    ) as [{ id: string }, Partial<RestockLotDoc>]
    expect(closeCall[1]).toEqual(expect.objectContaining({ status: 'closed' }))
  })

  it('does not re-close an already-closed lot that stays absent', async () => {
    resetMocks()
    existingDocs = [fakeDoc('3000003', 'closed')]
    mockParseLotListPage.mockReturnValueOnce({ lots: [], totalPages: 1, unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true))

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })

  it('fetches every page reported by parseLotListPage, in order', async () => {
    resetMocks()
    mockParseLotListPage
      .mockReturnValueOnce({ lots: [], totalPages: 3, unparsedCount: 0 })
      .mockReturnValueOnce({ lots: [], totalPages: 3, unparsedCount: 0 })
      .mockReturnValueOnce({ lots: [], totalPages: 3, unparsedCount: 0 })
    mockFetch
      .mockResolvedValueOnce(pageResponse(true))
      .mockResolvedValueOnce(pageResponse(true))
      .mockResolvedValueOnce(pageResponse(true))

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockFetch).toHaveBeenCalledTimes(3)
    const urls = mockFetch.mock.calls.map((call) => call[0] as string)
    expect(urls[0]).toContain('page=1')
    expect(urls[1]).toContain('page=2')
    expect(urls[2]).toContain('page=3')
  })

  it('stops fetching pages on a non-ok response instead of throwing', async () => {
    resetMocks()
    mockFetch.mockResolvedValueOnce(pageResponse(false, 503))

    await expect(
      scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' }),
    ).resolves.not.toThrow()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockParseLotListPage).not.toHaveBeenCalled()
    expect(mockBatchSet).not.toHaveBeenCalled()
    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })

  it('skips the manifest-table fetch and leaves hasManifest false when the detail-page fetch fails', async () => {
    resetMocks()
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], totalPages: 1, unparsedCount: 0 })
    mockFetch
      .mockResolvedValueOnce(pageResponse(true))
      .mockResolvedValueOnce(pageResponse(false, 404))

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockExtractManifestTable).not.toHaveBeenCalled()
    // only the lot doc itself - no manifest item docs when the fetch fails
    expect(mockBatchSet).toHaveBeenCalledTimes(1)
    const [, doc] = mockBatchSet.mock.calls[0] as [{ id: string }, RestockLotDoc]
    expect(doc.hasManifest).toBe(false)
  })

  it('sets hasManifest false when the page has no manifest table', async () => {
    resetMocks()
    mockParseLotListPage.mockReturnValueOnce({ lots: [lot()], totalPages: 1, unparsedCount: 0 })
    mockFetch.mockResolvedValueOnce(pageResponse(true)).mockResolvedValueOnce(pageResponse(true))
    mockExtractManifestTable.mockReturnValueOnce([])

    await scrapeRestockLots.run({ scheduleTime: '2026-01-01T00:00:00Z' })

    expect(mockBatchSet).toHaveBeenCalledTimes(1)
    const [, doc] = mockBatchSet.mock.calls[0] as [{ id: string }, RestockLotDoc]
    expect(doc.hasManifest).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'

const mockGet = vi.fn<(path: string) => Promise<unknown>>()
const mockUpdate = vi.fn<(path: string, data: unknown) => void>()
const mockSet = vi.fn<(path: string, data: unknown) => void>()
const mockDoc = vi.fn((path: string) => ({
  get: () => mockGet(path),
  update: (data: unknown) => {
    mockUpdate(path, data)
  },
  set: (data: unknown) => {
    mockSet(path, data)
  },
  exists: undefined,
}))
const mockCollectionGet = vi.fn<(path: string) => Promise<unknown>>()
const mockCollection = vi.fn((path: string) => ({ get: () => mockCollectionGet(path) }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc, collection: mockCollection }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockSave = vi.fn()
const mockFile = vi.fn(() => ({ save: mockSave }))
const mockBucket = vi.fn(() => ({ file: mockFile }))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: mockBucket }),
}))

const mockEnqueue = vi.fn()
const mockTaskQueue = vi.fn(() => ({ enqueue: mockEnqueue }))
vi.mock('firebase-admin/functions', () => ({
  getFunctions: () => ({ taskQueue: mockTaskQueue }),
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn() },
}))

const { importDiscoveredLotWorker } = await import('./importDiscoveredLotWorker')

function taskRequest(data: unknown) {
  return { data } as never
}

const validPayload = { tenantId: 'tenant-a', importId: 'import-1', lotId: 'lot-1' }
const activeLot = { hasManifest: true }

function itemsSnapshot(rows: Record<string, string>[]) {
  return { docs: rows.map((row) => ({ data: () => row })) }
}

function resetMocks() {
  mockGet.mockReset()
  mockUpdate.mockReset()
  mockSet.mockReset()
  mockDoc.mockClear()
  mockCollectionGet.mockReset()
  mockCollection.mockClear()
  mockSave.mockReset()
  mockEnqueue.mockReset()
}

describe('importDiscoveredLotWorker', () => {
  it('logs and returns on an invalid payload without touching Firestore', async () => {
    resetMocks()

    await importDiscoveredLotWorker.run(taskRequest({}))

    expect(mockDoc).not.toHaveBeenCalled()
  })

  it('marks the import failed if the lot no longer has a manifest', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ hasManifest: false }) })

    await expect(importDiscoveredLotWorker.run(taskRequest(validPayload))).rejects.toThrow(
      /no longer has a manifest/i,
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Discovered lot no longer has a manifest.',
      }),
    )
  })

  it('marks the import failed if hasManifest is true but no item docs exist', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => activeLot })
    mockCollectionGet.mockResolvedValueOnce(itemsSnapshot([]))

    await expect(importDiscoveredLotWorker.run(taskRequest(validPayload))).rejects.toThrow(
      /no longer has a manifest/i,
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({ status: 'failed' }),
    )
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('auto-provisions the vendor only when it does not already exist', async () => {
    resetMocks()
    mockGet
      .mockResolvedValueOnce({ data: () => activeLot }) // restock_lots
      .mockResolvedValueOnce({ exists: false }) // vendors/restock-ca
    mockCollectionGet.mockResolvedValueOnce(itemsSnapshot([{ UPC: '123', QTY: '1' }]))

    await importDiscoveredLotWorker.run(taskRequest(validPayload))

    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/vendors/restock-ca',
      expect.objectContaining({ name: 'Restock.ca (auto-imported)', manifestFormat: 'csv' }),
    )
  })

  it('skips vendor creation when it already exists, synthesizes a CSV, uploads it, updates the import, and hands off to processManifestImport', async () => {
    resetMocks()
    mockGet
      .mockResolvedValueOnce({ data: () => activeLot }) // restock_lots
      .mockResolvedValueOnce({ exists: true }) // vendors/restock-ca
    mockCollectionGet.mockResolvedValueOnce(
      itemsSnapshot([{ UPC: '123', QTY: '1', TITLE: 'Widget' }]),
    )

    await importDiscoveredLotWorker.run(taskRequest(validPayload))

    expect(mockCollection).toHaveBeenCalledWith('restock_lots/lot-1/manifestItems')
    expect(mockSet).not.toHaveBeenCalledWith(
      'tenants/tenant-a/vendors/restock-ca',
      expect.anything(),
    )
    expect(mockFile).toHaveBeenCalledWith('tenants/tenant-a/manifests/import-1/original.csv')
    const [buffer, options] = mockSave.mock.calls[0] as [Buffer, { contentType: string }]
    expect(buffer.toString()).toBe('UPC,QTY,TITLE\r\n123,1,Widget')
    expect(options).toEqual({ contentType: 'text/csv' })
    expect(mockUpdate).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({
        format: 'csv',
        storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
      }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('processManifestImport')
    expect(mockEnqueue).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      importId: 'import-1',
      storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
      format: 'csv',
    })
  })
})

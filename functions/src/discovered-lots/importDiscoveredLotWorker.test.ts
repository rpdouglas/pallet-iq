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

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
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

const mockFetchAndValidateManifest = vi.fn()
vi.mock('./fetchAndValidateManifest', () => ({
  fetchAndValidateManifest: mockFetchAndValidateManifest,
}))

const { importDiscoveredLotWorker } = await import('./importDiscoveredLotWorker')

function taskRequest(data: unknown) {
  return { data } as never
}

const validPayload = { tenantId: 'tenant-a', importId: 'import-1', lotId: 'lot-1' }
const activeLot = { manifestUrl: 'https://www.restock.ca/manifest.csv' }

function resetMocks() {
  mockGet.mockReset()
  mockUpdate.mockReset()
  mockSet.mockReset()
  mockDoc.mockClear()
  mockSave.mockReset()
  mockEnqueue.mockReset()
  mockFetchAndValidateManifest.mockReset()
}

describe('importDiscoveredLotWorker', () => {
  it('logs and returns on an invalid payload without touching Firestore', async () => {
    resetMocks()

    await importDiscoveredLotWorker.run(taskRequest({}))

    expect(mockDoc).not.toHaveBeenCalled()
  })

  it('marks the import failed if the lot no longer has a manifest link', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ manifestUrl: null }) })

    await expect(importDiscoveredLotWorker.run(taskRequest(validPayload))).rejects.toThrow(
      /no longer has a manifest/i,
    )

    expect(mockUpdate).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({
        status: 'failed',
        error: 'Discovered lot no longer has a manifest link.',
      }),
    )
  })

  it('marks the import failed with the fetch error when the manifest fetch/validation fails', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => activeLot })
    mockFetchAndValidateManifest.mockResolvedValueOnce({
      ok: false,
      error: 'Manifest not available in a supported format (CSV or XLSX required).',
    })

    await expect(importDiscoveredLotWorker.run(taskRequest(validPayload))).rejects.toThrow(
      /not available in a supported format/i,
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
    mockFetchAndValidateManifest.mockResolvedValueOnce({
      ok: true,
      format: 'csv',
      buffer: Buffer.from('a,b\n1,2\n'),
    })

    await importDiscoveredLotWorker.run(taskRequest(validPayload))

    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/vendors/restock-ca',
      expect.objectContaining({ name: 'Restock.ca (auto-imported)', manifestFormat: 'csv' }),
    )
  })

  it('skips vendor creation when it already exists, uploads the file, updates the import, and hands off to processManifestImport', async () => {
    resetMocks()
    mockGet
      .mockResolvedValueOnce({ data: () => activeLot }) // restock_lots
      .mockResolvedValueOnce({ exists: true }) // vendors/restock-ca
    mockFetchAndValidateManifest.mockResolvedValueOnce({
      ok: true,
      format: 'csv',
      buffer: Buffer.from('a,b\n1,2\n'),
    })

    await importDiscoveredLotWorker.run(taskRequest(validPayload))

    expect(mockSet).not.toHaveBeenCalledWith(
      'tenants/tenant-a/vendors/restock-ca',
      expect.anything(),
    )
    expect(mockFile).toHaveBeenCalledWith('tenants/tenant-a/manifests/import-1/original.csv')
    expect(mockSave).toHaveBeenCalledWith(Buffer.from('a,b\n1,2\n'), {
      contentType: 'text/csv',
    })
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

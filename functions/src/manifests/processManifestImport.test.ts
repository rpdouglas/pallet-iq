import { describe, expect, it, vi } from 'vitest'

const mockImportUpdate = vi.fn()
const mockDoc = vi.fn(() => ({ update: mockImportUpdate }))
const mockBatchSet = vi.fn()
const mockBatchCommit = vi.fn()
const mockBatch = vi.fn(() => ({ set: mockBatchSet, commit: mockBatchCommit }))
const mockCollectionDoc = vi.fn(() => ({}))
const mockCollection = vi.fn(() => ({ doc: mockCollectionDoc }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc, collection: mockCollection, batch: mockBatch }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockDownload = vi.fn()
const mockFile = vi.fn(() => ({ download: mockDownload }))
const mockBucket = vi.fn(() => ({ file: mockFile }))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: mockBucket }),
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn() },
}))

const mockParseFile = vi.fn()
vi.mock('./parseFile', () => ({ parseFile: mockParseFile }))

const { processManifestImport, MAX_FILE_SIZE_BYTES } = await import('./processManifestImport')

function taskRequest(data: unknown) {
  return { data } as never
}

const validPayload = {
  tenantId: 'tenant-a',
  importId: 'import-1',
  storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
  format: 'csv',
}

function resetMocks() {
  mockImportUpdate.mockClear()
  mockDoc.mockClear()
  mockCollection.mockClear()
  mockBatchSet.mockClear()
  mockBatchCommit.mockClear()
  mockDownload.mockClear()
  mockParseFile.mockClear()
}

describe('processManifestImport', () => {
  it('logs and returns on an invalid payload without touching Firestore', async () => {
    resetMocks()

    await processManifestImport.run(taskRequest({}))

    expect(mockDoc).not.toHaveBeenCalled()
  })

  it('parses, normalizes, batches line items and errors, then marks completed', async () => {
    resetMocks()
    mockDownload.mockResolvedValueOnce([Buffer.from('irrelevant, parseFile is mocked')])
    mockParseFile.mockResolvedValueOnce([
      { description: 'Widget', quantity: 10, unitCost: 4.5 },
      { description: '', quantity: 1, unitCost: 1 }, // missing description -> error
    ])

    await processManifestImport.run(taskRequest(validPayload))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/imports/import-1')
    expect(mockImportUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: 'processing' }),
    )

    expect(mockBatchSet).toHaveBeenCalledTimes(2)
    const [lineItemArgs, errorArgs] = mockBatchSet.mock.calls
    expect(lineItemArgs[1]).toEqual(
      expect.objectContaining({ description: 'Widget', quantity: 10, unitCost: 4.5 }),
    )
    expect(errorArgs[1]).toEqual(
      expect.objectContaining({
        reason: 'Missing description',
        rowNumber: 3,
        importId: 'import-1',
      }),
    )
    expect(mockBatchCommit).toHaveBeenCalledTimes(1)

    expect(mockImportUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'completed', rowCount: 2, successCount: 1, errorCount: 1 }),
    )
  })

  it('rejects a file over the size limit without calling parseFile', async () => {
    resetMocks()
    mockDownload.mockResolvedValueOnce([Buffer.alloc(MAX_FILE_SIZE_BYTES + 1)])

    await expect(processManifestImport.run(taskRequest(validPayload))).rejects.toThrow(
      /size limit/i,
    )

    expect(mockParseFile).not.toHaveBeenCalled()
    const lastUpdate = mockImportUpdate.mock.calls.at(-1)?.[0] as { status: string; error: string }
    expect(lastUpdate.status).toBe('failed')
    expect(lastUpdate.error).toMatch(/size limit/i)
  })

  it('marks the import failed and rethrows if parsing throws', async () => {
    resetMocks()
    mockDownload.mockResolvedValueOnce([Buffer.from('bad file')])
    mockParseFile.mockRejectedValueOnce(new Error('Corrupt file'))

    await expect(processManifestImport.run(taskRequest(validPayload))).rejects.toThrow(
      'Corrupt file',
    )

    expect(mockImportUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', error: 'Corrupt file' }),
    )
  })
})

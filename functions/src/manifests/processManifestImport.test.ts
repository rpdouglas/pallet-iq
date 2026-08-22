import { describe, expect, it, vi } from 'vitest'

const mockImportUpdate = vi.fn()
const mockImportGet = vi.fn(() => Promise.resolve({ data: () => ({ vendorId: 'vendor-1' }) }))
const mockDoc = vi.fn(() => ({ update: mockImportUpdate, get: mockImportGet }))
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

const mockValidateFile = vi.fn(() => Promise.resolve({ valid: true }))
vi.mock('./validateFile', () => ({ validateFile: mockValidateFile }))

const { processManifestImport, MAX_FILE_SIZE_BYTES, MAX_ROW_COUNT } =
  await import('./processManifestImport')

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
  mockImportGet.mockClear()
  mockDoc.mockClear()
  mockCollection.mockClear()
  mockBatchSet.mockClear()
  mockBatchCommit.mockClear()
  mockDownload.mockClear()
  mockParseFile.mockClear()
  mockValidateFile.mockClear()
  mockValidateFile.mockResolvedValue({ valid: true })
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

    expect(mockBatchSet).toHaveBeenCalledTimes(3)
    const [lineItemArgs, inventoryArgs, errorArgs] = mockBatchSet.mock.calls
    expect(lineItemArgs[1]).toEqual(
      expect.objectContaining({ description: 'Widget', quantity: 10, unitCost: 4.5 }),
    )
    expect(inventoryArgs[1]).toEqual(
      expect.objectContaining({
        description: 'Widget',
        quantity: 10,
        unitCost: 4.5,
        vendorId: 'vendor-1',
        manifestId: 'import-1',
        status: 'purchased',
      }),
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

  it('allocates a flat unit cost from totalPurchasePrice when rows have no direct cost (PALLETIQ-022 / ADR-0010)', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({
      data: () => ({ vendorId: 'vendor-1', totalPurchasePrice: 100 }),
    })
    mockDownload.mockResolvedValueOnce([Buffer.from('irrelevant, parseFile is mocked')])
    mockParseFile.mockResolvedValueOnce([
      { description: 'Scooter', quantity: 1 },
      { description: 'Mower', quantity: 3 },
    ])

    await processManifestImport.run(taskRequest(validPayload))

    // $100 lot / 4 total units = $25/unit, applied to every row regardless
    // of its own quantity - matches the owner's own worked example.
    expect(mockBatchSet).toHaveBeenCalledTimes(4)
    const [scooterLineItem, scooterInventory, mowerLineItem, mowerInventory] =
      mockBatchSet.mock.calls
    expect(scooterLineItem[1]).toEqual(
      expect.objectContaining({ description: 'Scooter', unitCost: 25 }),
    )
    expect(scooterInventory[1]).toEqual(expect.objectContaining({ unitCost: 25 }))
    expect(mowerLineItem[1]).toEqual(
      expect.objectContaining({ description: 'Mower', unitCost: 25 }),
    )
    expect(mowerInventory[1]).toEqual(expect.objectContaining({ unitCost: 25 }))
    expect(mockImportUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'completed', successCount: 2, errorCount: 0 }),
    )
  })

  it('lets a real manifest-stated cost win over the flat totalPurchasePrice rate', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({
      data: () => ({ vendorId: 'vendor-1', totalPurchasePrice: 100 }),
    })
    mockDownload.mockResolvedValueOnce([Buffer.from('irrelevant, parseFile is mocked')])
    mockParseFile.mockResolvedValueOnce([
      { description: 'Has real cost', quantity: 1, unitCost: 9.99 },
      { description: 'No cost given', quantity: 1 },
    ])

    await processManifestImport.run(taskRequest(validPayload))

    const [realCostLineItem, , noCostLineItem] = mockBatchSet.mock.calls
    expect(realCostLineItem[1]).toEqual(expect.objectContaining({ unitCost: 9.99 }))
    // 2 total units -> $50/unit flat rate for the row with no cost of its own.
    expect(noCostLineItem[1]).toEqual(expect.objectContaining({ unitCost: 50 }))
  })

  // PALLETIQ-023. totalPurchasePrice: 0 is a valid, correctly-entered free
  // lot (enqueueManifestImport only rejects < 0) - it must compute a flat
  // unit cost of 0 for cost-less rows, not be treated as "no price given"
  // and fail every such row's normalization outright.
  it('treats totalPurchasePrice: 0 as a real free-lot price, not a missing one', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({
      data: () => ({ vendorId: 'vendor-1', totalPurchasePrice: 0 }),
    })
    mockDownload.mockResolvedValueOnce([Buffer.from('irrelevant, parseFile is mocked')])
    mockParseFile.mockResolvedValueOnce([{ description: 'Free sample', quantity: 1 }])

    await processManifestImport.run(taskRequest(validPayload))

    const [lineItemArgs] = mockBatchSet.mock.calls
    expect(lineItemArgs[1]).toEqual(expect.objectContaining({ unitCost: 0 }))
    expect(mockImportUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'completed', successCount: 1, errorCount: 0 }),
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

  it('rejects a file that fails byte-level validation without calling parseFile', async () => {
    resetMocks()
    mockDownload.mockResolvedValueOnce([Buffer.from('irrelevant')])
    mockValidateFile.mockResolvedValueOnce({
      valid: false,
      error: 'Macro-enabled files are not supported.',
    })

    await expect(processManifestImport.run(taskRequest(validPayload))).rejects.toThrow(
      /macro-enabled/i,
    )

    expect(mockParseFile).not.toHaveBeenCalled()
    const lastUpdate = mockImportUpdate.mock.calls.at(-1)?.[0] as { status: string; error: string }
    expect(lastUpdate.status).toBe('failed')
    expect(lastUpdate.error).toMatch(/macro-enabled/i)
  })

  it('rejects a file with more rows than the row-count limit', async () => {
    resetMocks()
    mockDownload.mockResolvedValueOnce([Buffer.from('irrelevant')])
    mockParseFile.mockResolvedValueOnce(
      Array.from({ length: MAX_ROW_COUNT + 1 }, () => ({
        description: 'Widget',
        quantity: 1,
        unitCost: 1,
      })),
    )

    await expect(processManifestImport.run(taskRequest(validPayload))).rejects.toThrow(
      /row.*limit/i,
    )

    expect(mockBatchSet).not.toHaveBeenCalled()
    const lastUpdate = mockImportUpdate.mock.calls.at(-1)?.[0] as { status: string; error: string }
    expect(lastUpdate.status).toBe('failed')
    expect(lastUpdate.error).toMatch(/row.*limit/i)
  })

  it('marks the import failed if the import record has no vendorId', async () => {
    resetMocks()
    mockImportGet.mockResolvedValueOnce({ data: () => ({}) })

    await expect(processManifestImport.run(taskRequest(validPayload))).rejects.toThrow(/vendorId/i)

    const lastUpdate = mockImportUpdate.mock.calls.at(-1)?.[0] as { status: string; error: string }
    expect(lastUpdate.status).toBe('failed')
    expect(lastUpdate.error).toMatch(/vendorId/i)
    expect(mockParseFile).not.toHaveBeenCalled()
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

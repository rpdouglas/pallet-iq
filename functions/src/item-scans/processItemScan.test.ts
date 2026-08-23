import { describe, expect, it, vi } from 'vitest'

const mockScanUpdate = vi.fn()
const mockScanGet = vi.fn(() =>
  Promise.resolve({
    data: () => ({ photoPaths: ['tenants/tenant-a/item_scans/scan-1/photo-0.jpg'] }),
  }),
)
const mockDoc = vi.fn(() => ({ update: mockScanUpdate, get: mockScanGet }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockDownload = vi.fn(() => Promise.resolve([Buffer.from('fake-image-bytes')]))
const mockFile = vi.fn(() => ({ download: mockDownload }))
const mockBucket = vi.fn(() => ({ file: mockFile }))
vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({ bucket: mockBucket }),
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { error: vi.fn() },
}))

vi.mock('../gemini/params', () => ({
  geminiApiKey: { value: () => 'fake-key' },
}))

const CANDIDATE = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: null,
  notableFeatures: null,
  condition: 'good',
  conditionJustification: 'Minor scuffing.',
  confidence: 0.92,
}

const mockIdentifyItem = vi.fn(() =>
  Promise.resolve({ candidates: [CANDIDATE], selectedCandidateIndex: 0 }),
)
vi.mock('../gemini/identifyItem', () => ({
  identifyItem: mockIdentifyItem,
}))

const { processItemScan } = await import('./processItemScan')

function taskRequest(data: unknown) {
  return { data } as never
}

const validPayload = { tenantId: 'tenant-a', scanId: 'scan-1' }

function resetMocks() {
  mockScanUpdate.mockClear()
  mockScanGet.mockClear()
  mockScanGet.mockResolvedValue({
    data: () => ({ photoPaths: ['tenants/tenant-a/item_scans/scan-1/photo-0.jpg'] }),
  })
  mockDoc.mockClear()
  mockDownload.mockClear()
  mockDownload.mockResolvedValue([Buffer.from('fake-image-bytes')])
  mockFile.mockClear()
  mockIdentifyItem.mockClear()
  mockIdentifyItem.mockResolvedValue({ candidates: [CANDIDATE], selectedCandidateIndex: 0 })
}

describe('processItemScan', () => {
  it('logs and returns on an invalid payload without touching Firestore', async () => {
    resetMocks()

    await processItemScan.run(taskRequest({}))

    expect(mockDoc).not.toHaveBeenCalled()
  })

  it('downloads each photo, calls identifyItem, and marks the scan completed', async () => {
    resetMocks()
    mockScanGet.mockResolvedValueOnce({
      data: () => ({
        photoPaths: [
          'tenants/tenant-a/item_scans/scan-1/photo-0.jpg',
          'tenants/tenant-a/item_scans/scan-1/photo-1.png',
        ],
      }),
    })

    await processItemScan.run(taskRequest(validPayload))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/item_scans/scan-1')
    expect(mockScanUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: 'processing' }),
    )

    expect(mockFile).toHaveBeenCalledWith('tenants/tenant-a/item_scans/scan-1/photo-0.jpg')
    expect(mockFile).toHaveBeenCalledWith('tenants/tenant-a/item_scans/scan-1/photo-1.png')

    expect(mockIdentifyItem).toHaveBeenCalledWith('fake-key', [
      { data: Buffer.from('fake-image-bytes'), mimeType: 'image/jpeg' },
      { data: Buffer.from('fake-image-bytes'), mimeType: 'image/png' },
    ])

    expect(mockScanUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'completed',
        candidates: [CANDIDATE],
        selectedCandidateIndex: 0,
      }),
    )
  })

  it('marks the scan failed if photoPaths is missing', async () => {
    resetMocks()
    mockScanGet.mockResolvedValueOnce({ data: () => ({}) })

    await expect(processItemScan.run(taskRequest(validPayload))).rejects.toThrow(/photoPaths/i)

    const lastUpdate = mockScanUpdate.mock.calls.at(-1)?.[0] as { status: string; error: string }
    expect(lastUpdate.status).toBe('failed')
    expect(lastUpdate.error).toMatch(/photoPaths/i)
    expect(mockIdentifyItem).not.toHaveBeenCalled()
  })

  it('marks the scan failed and rethrows if identifyItem throws', async () => {
    resetMocks()
    mockIdentifyItem.mockRejectedValueOnce(new Error('Gemini exploded'))

    await expect(processItemScan.run(taskRequest(validPayload))).rejects.toThrow('Gemini exploded')

    expect(mockScanUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', error: 'Gemini exploded' }),
    )
  })

  it('falls back to application/octet-stream for an unrecognized extension', async () => {
    resetMocks()
    mockScanGet.mockResolvedValueOnce({
      data: () => ({ photoPaths: ['tenants/tenant-a/item_scans/scan-1/photo-0.heic5'] }),
    })

    await processItemScan.run(taskRequest(validPayload))

    expect(mockIdentifyItem).toHaveBeenCalledWith('fake-key', [
      { data: Buffer.from('fake-image-bytes'), mimeType: 'application/octet-stream' },
    ])
  })
})

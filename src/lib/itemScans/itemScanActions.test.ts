import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {}, storage: {}, app: {} }))

const collection = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const doc = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => ({
  id: 'generated-id',
  path,
}))
const getDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const updateDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('firebase/firestore', () => ({
  collection,
  doc,
  getDoc,
  updateDoc,
}))

const ref = vi.fn<(...args: unknown[]) => unknown>((_storage: unknown, path: unknown) => path)
const uploadBytes = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('firebase/storage', () => ({ ref, uploadBytes }))

const httpsCallableFn = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const httpsCallable = vi.fn<(...args: unknown[]) => (data: unknown) => Promise<unknown>>(
  () => httpsCallableFn,
)
const getFunctions = vi.fn<(...args: unknown[]) => unknown>()
vi.mock('firebase/functions', () => ({ getFunctions, httpsCallable }))

const { newScanId, uploadScanPhoto, enqueueItemScan, getItemScan, selectItemScanCandidate } =
  await import('./itemScanActions')

describe('itemScanActions', () => {
  it('newScanId generates an ID without writing', () => {
    expect(newScanId('tenant-a')).toBe('generated-id')
    expect(doc).toHaveBeenCalledWith('tenants/tenant-a/item_scans')
  })

  it('uploadScanPhoto uploads to an index-numbered path derived from the file extension', async () => {
    uploadBytes.mockResolvedValueOnce(undefined)
    const file = new File(['bytes'], 'photo.JPG')

    const result = await uploadScanPhoto('tenant-a', 'scan-1', 2, file)

    expect(result).toEqual({
      storagePath: 'tenants/tenant-a/item_scans/scan-1/photo-2.JPG',
    })
    expect(uploadBytes).toHaveBeenCalledWith('tenants/tenant-a/item_scans/scan-1/photo-2.JPG', file)
  })

  it('enqueueItemScan calls the callable with the given params', async () => {
    httpsCallableFn.mockResolvedValueOnce({ data: { scanId: 'scan-1' } })
    const params = {
      scanId: 'scan-1',
      photoPaths: ['tenants/tenant-a/item_scans/scan-1/photo-0.jpg'],
    }

    const result = await enqueueItemScan(params)

    expect(httpsCallable).toHaveBeenCalledWith(undefined, 'enqueueItemScan')
    expect(httpsCallableFn).toHaveBeenCalledWith(params)
    expect(result).toEqual({ scanId: 'scan-1' })
  })

  it('getItemScan returns null for a missing doc', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false })

    expect(await getItemScan('tenant-a', 'missing')).toBeNull()
  })

  it('getItemScan maps an existing doc', async () => {
    getDoc.mockResolvedValueOnce({
      id: 'scan-1',
      exists: () => true,
      data: () => ({ status: 'completed', photoPaths: [], candidates: [], error: null }),
    })

    expect(await getItemScan('tenant-a', 'scan-1')).toEqual({
      id: 'scan-1',
      status: 'completed',
      photoPaths: [],
      candidates: [],
      error: null,
    })
  })

  it('selectItemScanCandidate writes selectedCandidateIndex to the scan doc', async () => {
    updateDoc.mockResolvedValueOnce(undefined)

    await selectItemScanCandidate('tenant-a', 'scan-1', 1)

    expect(doc).toHaveBeenCalledWith({}, 'tenants/tenant-a/item_scans/scan-1')
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'generated-id', path: 'tenants/tenant-a/item_scans/scan-1' },
      { selectedCandidateIndex: 1 },
    )
  })
})

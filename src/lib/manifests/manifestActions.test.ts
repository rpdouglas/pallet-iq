import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {}, storage: {}, app: {} }))

const collection = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const doc = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => ({
  id: 'generated-id',
  path,
}))
const getDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getDocs = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const orderBy = vi.fn<(...args: unknown[]) => unknown>((...args: unknown[]) => args)
const query = vi.fn<(...args: unknown[]) => unknown>((...args: unknown[]) => args)
const where = vi.fn<(...args: unknown[]) => unknown>((...args: unknown[]) => args)
vi.mock('firebase/firestore', () => ({ collection, doc, getDoc, getDocs, orderBy, query, where }))

const ref = vi.fn<(...args: unknown[]) => unknown>((_storage: unknown, path: unknown) => path)
const uploadBytes = vi.fn<(...args: unknown[]) => Promise<unknown>>()
vi.mock('firebase/storage', () => ({ ref, uploadBytes }))

const httpsCallableFn = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const httpsCallable = vi.fn<(...args: unknown[]) => (data: unknown) => Promise<unknown>>(
  () => httpsCallableFn,
)
const getFunctions = vi.fn<(...args: unknown[]) => unknown>()
vi.mock('firebase/functions', () => ({ getFunctions, httpsCallable }))

const {
  newImportId,
  uploadManifestFile,
  enqueueManifestImport,
  listImports,
  getImport,
  listLineItems,
  listImportErrors,
} = await import('./manifestActions')

describe('manifestActions', () => {
  it('newImportId generates an ID without writing', () => {
    expect(newImportId('tenant-a')).toBe('generated-id')
    expect(doc).toHaveBeenCalledWith('tenants/tenant-a/imports')
  })

  it('uploadManifestFile uploads to a path derived from the file extension', async () => {
    uploadBytes.mockResolvedValueOnce(undefined)
    const file = new File(['a,b,c'], 'manifest.CSV')

    const result = await uploadManifestFile('tenant-a', 'import-1', file)

    expect(result).toEqual({ storagePath: 'tenants/tenant-a/manifests/import-1/original.CSV' })
    expect(uploadBytes).toHaveBeenCalledWith(
      'tenants/tenant-a/manifests/import-1/original.CSV',
      file,
    )
  })

  it('enqueueManifestImport calls the callable with the given params', async () => {
    httpsCallableFn.mockResolvedValueOnce({ data: { importId: 'import-1' } })
    const params = {
      vendorId: 'vendor-1',
      importId: 'import-1',
      storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
      fileName: 'manifest.csv',
    }

    const result = await enqueueManifestImport(params)

    expect(httpsCallable).toHaveBeenCalledWith(undefined, 'enqueueManifestImport')
    expect(httpsCallableFn).toHaveBeenCalledWith(params)
    expect(result).toEqual({ importId: 'import-1' })
  })

  it('listImports maps docs into ImportSummary objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'import-1', data: () => ({ vendorId: 'vendor-1', status: 'completed' }) }],
    })

    const result = await listImports('tenant-a')

    expect(result).toEqual([{ id: 'import-1', vendorId: 'vendor-1', status: 'completed' }])
  })

  it('getImport returns null for a missing doc', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false })

    expect(await getImport('tenant-a', 'missing')).toBeNull()
  })

  it('getImport maps an existing doc', async () => {
    getDoc.mockResolvedValueOnce({
      id: 'import-1',
      exists: () => true,
      data: () => ({ vendorId: 'vendor-1', status: 'queued' }),
    })

    expect(await getImport('tenant-a', 'import-1')).toEqual({
      id: 'import-1',
      vendorId: 'vendor-1',
      status: 'queued',
    })
  })

  it('listLineItems maps docs into LineItem objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'item-1', data: () => ({ description: 'Widget', quantity: 1, unitCost: 1 }) }],
    })

    expect(await listLineItems('tenant-a', 'import-1')).toEqual([
      { id: 'item-1', description: 'Widget', quantity: 1, unitCost: 1 },
    ])
  })

  it('listImportErrors maps docs into ImportErrorRecord objects', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'error-1', data: () => ({ rowNumber: 3, reason: 'Missing description' }) }],
    })

    expect(await listImportErrors('tenant-a', 'import-1')).toEqual([
      { id: 'error-1', rowNumber: 3, reason: 'Missing description' },
    ])
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

const mockGet = vi.fn<(path: string) => Promise<unknown>>()
const mockSet = vi.fn<(path: string, data: unknown) => void>()
const mockDoc = vi.fn((path: string) => ({
  get: () => mockGet(path),
  set: (data: unknown) => {
    mockSet(path, data)
  },
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockEnqueue = vi.fn()
const mockTaskQueue = vi.fn(() => ({ enqueue: mockEnqueue }))
vi.mock('firebase-admin/functions', () => ({
  getFunctions: () => ({ taskQueue: mockTaskQueue }),
}))

const { enqueueManifestImport } = await import('./enqueueManifestImport')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

const validData = {
  vendorId: 'vendor-1',
  importId: 'import-1',
  storagePath: 'tenants/tenant-a/manifests/import-1/original.csv',
  fileName: 'manifest.csv',
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

describe('enqueueManifestImport', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(enqueueManifestImport.run(request(validData, undefined))).rejects.toThrow(
      /sign in/i,
    )
  })

  it('rejects a caller with no tenantId claim', async () => {
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']

    await expect(enqueueManifestImport.run(request(validData, noTenantAuth))).rejects.toThrow(
      /tenant membership/i,
    )
  })

  it('rejects a manager (not owner or buyer)', async () => {
    await expect(enqueueManifestImport.run(request(validData, auth('manager')))).rejects.toThrow(
      /owner or buyer/i,
    )
  })

  it('rejects a warehouse-role caller', async () => {
    await expect(enqueueManifestImport.run(request(validData, auth('warehouse')))).rejects.toThrow(
      /owner or buyer/i,
    )
  })

  it('rejects a storagePath outside the expected import folder', async () => {
    await expect(
      enqueueManifestImport.run(
        request(
          { ...validData, storagePath: 'tenants/tenant-a/manifests/other-import/x.csv' },
          auth('buyer'),
        ),
      ),
    ).rejects.toThrow(/does not match/i)
  })

  it('rejects a vendorId that does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false })

    await expect(enqueueManifestImport.run(request(validData, auth('buyer')))).rejects.toThrow(
      /vendor not found/i,
    )
  })

  it('rejects a negative totalPurchasePrice', async () => {
    await expect(
      enqueueManifestImport.run(request({ ...validData, totalPurchasePrice: -5 }, auth('buyer'))),
    ).rejects.toThrow(/totalPurchasePrice/i)
  })

  it('rejects a non-numeric totalPurchasePrice', async () => {
    await expect(
      enqueueManifestImport.run(
        request({ ...validData, totalPurchasePrice: 'a lot' }, auth('buyer')),
      ),
    ).rejects.toThrow(/totalPurchasePrice/i)
  })

  it('rejects a vendor with no manifest format configured', async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) })

    await expect(enqueueManifestImport.run(request(validData, auth('owner')))).rejects.toThrow(
      /manifest format/i,
    )
  })

  it("uses the vendor's manifestFormat, not any client-supplied value, and enqueues the task", async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ manifestFormat: 'xlsx' }) })
    mockSet.mockClear()
    mockDoc.mockClear()
    mockEnqueue.mockClear()

    const result = await enqueueManifestImport.run(request(validData, auth('buyer')))

    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/imports/import-1')
    expect(mockDoc).toHaveBeenCalledWith('tenants/tenant-a/manifests/import-1')
    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({
        status: 'queued',
        format: 'xlsx',
        vendorId: 'vendor-1',
        freightCost: 0,
        otherFees: 0,
      }),
    )
    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/manifests/import-1',
      expect.objectContaining({ vendorId: 'vendor-1', importId: 'import-1' }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('processManifestImport')
    expect(mockEnqueue).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      importId: 'import-1',
      storagePath: validData.storagePath,
      format: 'xlsx',
    })
    expect(result).toEqual({ importId: 'import-1' })
  })

  it('writes a null totalPurchasePrice when none is given, and a real value when it is', async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ manifestFormat: 'csv' }) })
    mockSet.mockClear()

    await enqueueManifestImport.run(request(validData, auth('buyer')))

    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({ totalPurchasePrice: null }),
    )

    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ manifestFormat: 'csv' }) })
    mockSet.mockClear()

    await enqueueManifestImport.run(
      request({ ...validData, totalPurchasePrice: 100 }, auth('buyer')),
    )

    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({ totalPurchasePrice: 100 }),
    )
  })
})

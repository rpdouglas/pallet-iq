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
const mockNewDoc = vi.fn(() => ({
  id: 'import-1',
  set: (data: unknown) => {
    mockSet('tenants/tenant-a/imports/import-1', data)
  },
}))
const mockCollection = vi.fn(() => ({ doc: mockNewDoc }))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc, collection: mockCollection }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}))

const mockEnqueue = vi.fn()
const mockTaskQueue = vi.fn(() => ({ enqueue: mockEnqueue }))
vi.mock('firebase-admin/functions', () => ({
  getFunctions: () => ({ taskQueue: mockTaskQueue }),
}))

const { enqueueDiscoveredLotImport } = await import('./enqueueDiscoveredLotImport')

function request<T>(data: T, auth: CallableRequest['auth']): CallableRequest<T> {
  return { data, auth } as CallableRequest<T>
}

function auth(role: string) {
  return { uid: 'u1', token: { tenantId: 'tenant-a', role } } as CallableRequest['auth']
}

const activeLot = {
  status: 'active',
  manifestUrl: 'https://www.restock.ca/manifest.csv',
  price: 250,
}

describe('enqueueDiscoveredLotImport', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(
      enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, undefined)),
    ).rejects.toThrow(/sign in/i)
  })

  it('rejects a caller with no tenantId claim', async () => {
    const noTenantAuth = { uid: 'u1', token: {} } as CallableRequest['auth']
    await expect(
      enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, noTenantAuth)),
    ).rejects.toThrow(/tenant membership/i)
  })

  it('rejects a manager (not owner or buyer)', async () => {
    await expect(
      enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, auth('manager'))),
    ).rejects.toThrow(/owner or buyer/i)
  })

  it('rejects a missing lotId', async () => {
    await expect(enqueueDiscoveredLotImport.run(request({}, auth('buyer')))).rejects.toThrow(
      /lotId is required/i,
    )
  })

  it('rejects a lot that does not exist', async () => {
    mockGet.mockResolvedValueOnce({ data: () => undefined })

    await expect(
      enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, auth('buyer'))),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects a lot that is no longer active', async () => {
    mockGet.mockResolvedValueOnce({ data: () => ({ ...activeLot, status: 'closed' }) })

    await expect(
      enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, auth('buyer'))),
    ).rejects.toThrow(/no longer active/i)
  })

  it('rejects a lot with no manifestUrl', async () => {
    mockGet.mockResolvedValueOnce({ data: () => ({ ...activeLot, manifestUrl: null }) })

    await expect(
      enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, auth('buyer'))),
    ).rejects.toThrow(/no manifest to import/i)
  })

  it('writes a queued import doc sourced from the lot and enqueues the worker', async () => {
    mockGet.mockResolvedValueOnce({ data: () => activeLot })
    mockSet.mockClear()
    mockEnqueue.mockClear()

    const result = await enqueueDiscoveredLotImport.run(request({ lotId: 'lot-1' }, auth('buyer')))

    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/imports/import-1',
      expect.objectContaining({
        vendorId: 'restock-ca',
        status: 'queued',
        totalPurchasePrice: 250,
        sourceRestockLotId: 'lot-1',
      }),
    )
    expect(mockSet).toHaveBeenCalledWith(
      'tenants/tenant-a/manifests/import-1',
      expect.objectContaining({ vendorId: 'restock-ca', importId: 'import-1' }),
    )
    expect(mockTaskQueue).toHaveBeenCalledWith('importDiscoveredLotWorker')
    expect(mockEnqueue).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      importId: 'import-1',
      lotId: 'lot-1',
    })
    expect(result).toEqual({ importId: 'import-1' })
  })
})

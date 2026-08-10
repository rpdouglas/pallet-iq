import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))

const addDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const updateDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const deleteDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getDocs = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const collection = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: string) => path)
const doc = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: string) => path)
const serverTimestamp = vi.fn<() => string>(() => 'SERVER_TIMESTAMP')
vi.mock('firebase/firestore', () => ({
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  doc,
  serverTimestamp,
}))

const { listVendors, createVendor, updateVendor, deleteVendor } = await import('./vendorActions')

const VENDOR_VALUES = {
  name: 'Acme Liquidation',
  manifestFormat: 'csv' as const,
  contactEmail: 'sales@acme.example',
  contactPhone: '555-0100',
  terms: 'Net 30',
}

describe('vendorActions', () => {
  it('listVendors maps Firestore docs into Vendor objects with id', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'vendor-1', data: () => VENDOR_VALUES }],
    })

    const vendors = await listVendors('tenant-a')

    expect(collection).toHaveBeenCalledWith({}, 'tenants/tenant-a/vendors')
    expect(vendors).toEqual([{ id: 'vendor-1', ...VENDOR_VALUES }])
  })

  it('createVendor writes the form values plus a createdAt timestamp', async () => {
    addDoc.mockResolvedValueOnce(undefined)

    await createVendor('tenant-a', VENDOR_VALUES)

    expect(addDoc).toHaveBeenCalledWith('tenants/tenant-a/vendors', {
      ...VENDOR_VALUES,
      createdAt: 'SERVER_TIMESTAMP',
    })
  })

  it('updateVendor writes to the specific vendor doc plus an updatedAt timestamp', async () => {
    updateDoc.mockResolvedValueOnce(undefined)

    await updateVendor('tenant-a', 'vendor-1', VENDOR_VALUES)

    expect(doc).toHaveBeenCalledWith({}, 'tenants/tenant-a/vendors/vendor-1')
    expect(updateDoc).toHaveBeenCalledWith('tenants/tenant-a/vendors/vendor-1', {
      ...VENDOR_VALUES,
      updatedAt: 'SERVER_TIMESTAMP',
    })
  })

  it('deleteVendor deletes the specific vendor doc', async () => {
    deleteDoc.mockResolvedValueOnce(undefined)

    await deleteVendor('tenant-a', 'vendor-1')

    expect(deleteDoc).toHaveBeenCalledWith('tenants/tenant-a/vendors/vendor-1')
  })
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))

const getDocs = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const setDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const collection = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const doc = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const serverTimestamp = vi.fn<() => string>(() => 'SERVER_TIMESTAMP')
vi.mock('firebase/firestore', () => ({ getDocs, setDoc, collection, doc, serverTimestamp }))

const { listDismissedLotIds, dismissLot } = await import('./dismissedLotsActions')

describe('dismissedLotsActions', () => {
  it('listDismissedLotIds returns the set of dismissed doc IDs', async () => {
    getDocs.mockResolvedValueOnce({ docs: [{ id: 'lot-1' }, { id: 'lot-2' }] })

    const ids = await listDismissedLotIds('tenant-a')

    expect(collection).toHaveBeenCalledWith({}, 'tenants/tenant-a/dismissed_lots')
    expect(ids).toEqual(new Set(['lot-1', 'lot-2']))
  })

  it('dismissLot writes a dismissal doc keyed by lotId', async () => {
    setDoc.mockResolvedValueOnce(undefined)

    await dismissLot('tenant-a', 'lot-1')

    expect(doc).toHaveBeenCalledWith({}, 'tenants/tenant-a/dismissed_lots/lot-1')
    expect(setDoc).toHaveBeenCalledWith('tenants/tenant-a/dismissed_lots/lot-1', {
      dismissedAt: 'SERVER_TIMESTAMP',
    })
  })
})

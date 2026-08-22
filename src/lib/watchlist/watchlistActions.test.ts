import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))

const addDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const deleteDoc = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const getDocs = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const collection = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const doc = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const serverTimestamp = vi.fn<() => string>(() => 'SERVER_TIMESTAMP')
vi.mock('firebase/firestore', () => ({
  addDoc,
  deleteDoc,
  getDocs,
  collection,
  doc,
  serverTimestamp,
}))

const { listWatchlistLots, createWatchlistLot, deleteWatchlistLot } =
  await import('./watchlistActions')

const LOT_VALUES = {
  title: 'Pallet of returned electronics',
  source: 'bstock' as const,
  category: 'Electronics',
  units: 42,
  currentBid: 250,
  closesAt: new Date('2026-09-01T18:00:00.000Z'),
  productUrl: 'https://bstock.example/lot/123',
  notes: 'Watch for the reserve price',
}

describe('watchlistActions', () => {
  it('listWatchlistLots maps Firestore docs into WatchlistLot objects with id', async () => {
    const stored = { ...LOT_VALUES, closesAt: LOT_VALUES.closesAt.toISOString() }
    getDocs.mockResolvedValueOnce({
      docs: [{ id: 'lot-1', data: () => stored }],
    })

    const lots = await listWatchlistLots('tenant-a')

    expect(collection).toHaveBeenCalledWith({}, 'tenants/tenant-a/watchlist_lots')
    expect(lots).toEqual([{ id: 'lot-1', ...stored }])
  })

  it('createWatchlistLot writes the form values, converting closesAt to an ISO string', async () => {
    addDoc.mockResolvedValueOnce(undefined)

    await createWatchlistLot('tenant-a', LOT_VALUES)

    expect(addDoc).toHaveBeenCalledWith('tenants/tenant-a/watchlist_lots', {
      title: LOT_VALUES.title,
      source: LOT_VALUES.source,
      category: LOT_VALUES.category,
      units: LOT_VALUES.units,
      currentBid: LOT_VALUES.currentBid,
      closesAt: LOT_VALUES.closesAt.toISOString(),
      productUrl: LOT_VALUES.productUrl,
      notes: LOT_VALUES.notes,
      addedAt: 'SERVER_TIMESTAMP',
    })
  })

  it('createWatchlistLot defaults optional fields to null when omitted', async () => {
    addDoc.mockResolvedValueOnce(undefined)

    await createWatchlistLot('tenant-a', {
      title: 'Mystery lot',
      source: 'direct_liquidation',
      category: '',
      productUrl: 'https://directliquidation.example/lot/9',
      notes: '',
    })

    expect(addDoc).toHaveBeenCalledWith(
      'tenants/tenant-a/watchlist_lots',
      expect.objectContaining({ units: null, currentBid: null, closesAt: null }),
    )
  })

  it('deleteWatchlistLot deletes the specific lot doc', async () => {
    deleteDoc.mockResolvedValueOnce(undefined)

    await deleteWatchlistLot('tenant-a', 'lot-1')

    expect(doc).toHaveBeenCalledWith({}, 'tenants/tenant-a/watchlist_lots/lot-1')
    expect(deleteDoc).toHaveBeenCalledWith('tenants/tenant-a/watchlist_lots/lot-1')
  })
})

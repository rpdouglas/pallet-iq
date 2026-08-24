import { describe, expect, it, vi } from 'vitest'

vi.mock('../firebase', () => ({ db: {} }))

const getDocs = vi.fn<(...args: unknown[]) => Promise<unknown>>()
const collection = vi.fn<(...args: unknown[]) => unknown>((_db: unknown, path: unknown) => path)
const query = vi.fn<(...args: unknown[]) => unknown>((ref: unknown, ...clauses: unknown[]) => ({
  ref,
  clauses,
}))
const where = vi.fn<(...args: unknown[]) => unknown>(
  (field: unknown, op: unknown, value: unknown) => ({
    field,
    op,
    value,
  }),
)
vi.mock('firebase/firestore', () => ({ getDocs, collection, query, where }))

const { listActiveRestockLots } = await import('./restockLotsActions')

describe('restockLotsActions', () => {
  it('queries the global restock_lots collection filtered to status == active', async () => {
    getDocs.mockResolvedValueOnce({ docs: [] })

    await listActiveRestockLots()

    expect(collection).toHaveBeenCalledWith({}, 'restock_lots')
    expect(where).toHaveBeenCalledWith('status', '==', 'active')
    expect(query).toHaveBeenCalledWith('restock_lots', {
      field: 'status',
      op: '==',
      value: 'active',
    })
  })

  it('maps Firestore docs into RestockLot objects with id', async () => {
    const stored = {
      title: 'Staples Canada stacking chairs',
      category: 'Furniture',
      units: 40,
      condition: 'Returns',
      msrp: 199.99,
      price: 89.99,
      costPerUnit: 2.25,
      vendor: 'Staples Canada',
      warehouse: 'ON1',
      productUrl: 'https://restock.ca/lot/1011402',
      imageUrl: 'https://restock.ca/img/1011402.jpg',
      hasManifest: false,
      firstSeenAt: { toMillis: () => 1_000 },
    }
    getDocs.mockResolvedValueOnce({ docs: [{ id: '1011402', data: () => stored }] })

    const lots = await listActiveRestockLots()

    expect(lots).toEqual([{ id: '1011402', ...stored }])
  })
})

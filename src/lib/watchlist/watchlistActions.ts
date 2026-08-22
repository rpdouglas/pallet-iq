import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { WatchlistLot } from '../../types/watchlistLot'
import type { WatchlistLotFormValues } from './schemas'

function watchlistLotsRef(tenantId: string) {
  return collection(db, `tenants/${tenantId}/watchlist_lots`)
}

export async function listWatchlistLots(tenantId: string): Promise<WatchlistLot[]> {
  const snap = await getDocs(watchlistLotsRef(tenantId))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WatchlistLot, 'id'>) }))
}

export async function createWatchlistLot(
  tenantId: string,
  values: WatchlistLotFormValues,
): Promise<void> {
  await addDoc(watchlistLotsRef(tenantId), {
    title: values.title,
    source: values.source,
    category: values.category,
    units: values.units ?? null,
    currentBid: values.currentBid ?? null,
    closesAt: values.closesAt ? values.closesAt.toISOString() : null,
    productUrl: values.productUrl,
    notes: values.notes,
    addedAt: serverTimestamp(),
  })
}

export async function deleteWatchlistLot(tenantId: string, lotId: string): Promise<void> {
  await deleteDoc(doc(db, `tenants/${tenantId}/watchlist_lots/${lotId}`))
}

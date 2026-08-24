import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

function dismissedLotsRef(tenantId: string) {
  return collection(db, `tenants/${tenantId}/dismissed_lots`)
}

// PALLETIQ-043. restock_lots is global (ADR-0009) and never mutated here -
// this only records that the current tenant no longer wants to see a
// given lot ID, same "overlay, not a delete" shape as this ticket's own
// scope note.
export async function listDismissedLotIds(tenantId: string): Promise<Set<string>> {
  const snap = await getDocs(dismissedLotsRef(tenantId))
  return new Set(snap.docs.map((d) => d.id))
}

export async function dismissLot(tenantId: string, lotId: string): Promise<void> {
  await setDoc(doc(db, `tenants/${tenantId}/dismissed_lots/${lotId}`), {
    dismissedAt: serverTimestamp(),
  })
}

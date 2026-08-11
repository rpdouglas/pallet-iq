import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { InventoryItem, InventoryStatus } from '../../types/inventory'

function inventoryRef(tenantId: string) {
  return collection(db, `tenants/${tenantId}/inventory`)
}

export async function listInventory(tenantId: string): Promise<InventoryItem[]> {
  const snap = await getDocs(query(inventoryRef(tenantId), orderBy('createdAt', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InventoryItem, 'id'>) }))
}

// PALLETIQ-011 / ADR-0007 - collection-level RBAC (owner/manager/warehouse
// can all call this), not per-transition. Direct client write, no Cloud
// Function - the isOwnerOrManagerOrWarehouse rule already covers this doc.
export async function updateInventoryStatus(
  tenantId: string,
  inventoryId: string,
  status: InventoryStatus,
): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/inventory/${inventoryId}`), {
    status,
    updatedAt: serverTimestamp(),
  })
}

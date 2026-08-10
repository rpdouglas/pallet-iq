import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Vendor } from '../../types/vendor'
import type { VendorFormValues } from './schemas'

function vendorsRef(tenantId: string) {
  return collection(db, `tenants/${tenantId}/vendors`)
}

export async function listVendors(tenantId: string): Promise<Vendor[]> {
  const snap = await getDocs(vendorsRef(tenantId))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Vendor, 'id'>) }))
}

export async function createVendor(tenantId: string, values: VendorFormValues): Promise<void> {
  await addDoc(vendorsRef(tenantId), { ...values, createdAt: serverTimestamp() })
}

export async function updateVendor(
  tenantId: string,
  vendorId: string,
  values: VendorFormValues,
): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/vendors/${vendorId}`), {
    ...values,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteVendor(tenantId: string, vendorId: string): Promise<void> {
  await deleteDoc(doc(db, `tenants/${tenantId}/vendors/${vendorId}`))
}

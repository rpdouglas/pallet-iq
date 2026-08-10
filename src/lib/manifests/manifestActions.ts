import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ref, uploadBytes } from 'firebase/storage'
import { app, db, storage } from '../firebase'
import type { ImportErrorRecord, ImportSummary, LineItem } from '../../types/manifest'

const functions = getFunctions(app)

// Client-generated so the file can be uploaded to Storage at a path
// containing this ID *before* enqueueManifestImport is called - see
// ADR-0006. Firestore's own ID generation, no write performed.
export function newImportId(tenantId: string): string {
  return doc(collection(db, `tenants/${tenantId}/imports`)).id
}

export async function uploadManifestFile(
  tenantId: string,
  importId: string,
  file: File,
): Promise<{ storagePath: string }> {
  const extension = file.name.split('.').pop() ?? 'dat'
  const storagePath = `tenants/${tenantId}/manifests/${importId}/original.${extension}`
  await uploadBytes(ref(storage, storagePath), file)
  return { storagePath }
}

export async function enqueueManifestImport(params: {
  vendorId: string
  importId: string
  storagePath: string
  fileName: string
}): Promise<{ importId: string }> {
  const call = httpsCallable<typeof params, { importId: string }>(
    functions,
    'enqueueManifestImport',
  )
  return (await call(params)).data
}

export async function listImports(tenantId: string): Promise<ImportSummary[]> {
  const snap = await getDocs(
    query(collection(db, `tenants/${tenantId}/imports`), orderBy('createdAt', 'desc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ImportSummary, 'id'>) }))
}

export async function getImport(tenantId: string, importId: string): Promise<ImportSummary | null> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/imports/${importId}`))
  if (!snap.exists()) {
    return null
  }
  return { id: snap.id, ...(snap.data() as Omit<ImportSummary, 'id'>) }
}

export async function listLineItems(tenantId: string, importId: string): Promise<LineItem[]> {
  const snap = await getDocs(collection(db, `tenants/${tenantId}/manifests/${importId}/lineItems`))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LineItem, 'id'>) }))
}

export async function listImportErrors(
  tenantId: string,
  importId: string,
): Promise<ImportErrorRecord[]> {
  const snap = await getDocs(
    query(collection(db, `tenants/${tenantId}/imports_errors`), where('importId', '==', importId)),
  )
  return snap.docs.map((d) => {
    const data = d.data() as { rowNumber: number; reason: string }
    return { id: d.id, rowNumber: data.rowNumber, reason: data.reason }
  })
}

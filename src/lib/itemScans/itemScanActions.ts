import { collection, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { ref, uploadBytes } from 'firebase/storage'
import { app, db, storage } from '../firebase'
import type { ItemScan } from '../../types/itemScan'

const functions = getFunctions(app)

// Client-generated, same reasoning as manifestActions' newImportId - photos
// must upload to Storage at a path containing this ID *before*
// enqueueItemScan is called (see ADR-0011).
export function newScanId(tenantId: string): string {
  return doc(collection(db, `tenants/${tenantId}/item_scans`)).id
}

export async function uploadScanPhoto(
  tenantId: string,
  scanId: string,
  index: number,
  file: File,
): Promise<{ storagePath: string }> {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `tenants/${tenantId}/item_scans/${scanId}/photo-${index.toString()}.${extension}`
  await uploadBytes(ref(storage, storagePath), file)
  return { storagePath }
}

export async function enqueueItemScan(params: {
  scanId: string
  photoPaths: string[]
}): Promise<{ scanId: string }> {
  const call = httpsCallable<typeof params, { scanId: string }>(functions, 'enqueueItemScan')
  return (await call(params)).data
}

export async function getItemScan(tenantId: string, scanId: string): Promise<ItemScan | null> {
  const snap = await getDoc(doc(db, `tenants/${tenantId}/item_scans/${scanId}`))
  if (!snap.exists()) {
    return null
  }
  return { id: snap.id, ...(snap.data() as Omit<ItemScan, 'id'>) }
}

// Direct client write, no Cloud Function - the existing isOwnerOrBuyer rule
// on item_scans/{scanId} already covers this doc, same posture as
// manifestActions' updateImportCosts. Used by the low-confidence top-3
// candidate picker (ADR-0011, this ticket's scope note) - the Buyer picks
// or corrects Gemini's uncertain answer directly.
export async function selectItemScanCandidate(
  tenantId: string,
  scanId: string,
  candidateIndex: number,
): Promise<void> {
  await updateDoc(doc(db, `tenants/${tenantId}/item_scans/${scanId}`), {
    selectedCandidateIndex: candidateIndex,
  })
}

// PALLETIQ-026 / ADR-0011, re-shaped by PALLETIQ-035 / ADR-0012. Enqueue-
// only now - the pricing result arrives via the item_scans doc once
// priceItemScanWorker finishes, same polling pattern ItemScanPage.tsx
// already uses for identification.
export async function priceItemScan(scanId: string): Promise<void> {
  const call = httpsCallable<{ scanId: string }, null>(functions, 'priceItemScan')
  await call({ scanId })
}

// PALLETIQ-033 / ADR-0011. Re-scores saleability only, without re-running
// priceItemScan's full waterfall - for the saleability-failed retry path,
// where pricing itself already succeeded.
export async function retrySaleabilityScore(scanId: string): Promise<void> {
  const call = httpsCallable<{ scanId: string }, null>(functions, 'retrySaleabilityScore')
  await call({ scanId })
}

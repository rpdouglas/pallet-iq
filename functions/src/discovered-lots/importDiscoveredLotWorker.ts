import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions/v2'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { RESTOCK_VENDOR_ID } from './enqueueDiscoveredLotImport'
import { fetchAndValidateManifest } from './fetchAndValidateManifest'
import type { ImportDoc } from '../manifests/types'
import type { RestockLotDoc } from '../restock-scraper/types'

interface ImportDiscoveredLotWorkerPayload {
  tenantId?: unknown
  importId?: unknown
  lotId?: unknown
}

const CONTENT_TYPE_BY_FORMAT: Record<'csv' | 'xlsx', string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// PALLETIQ-041 / ADR-0015. Get-or-create, idempotent - the first tenant to
// import any restock.ca lot creates this once; every later import for that
// tenant reuses it. Rejected alternative: a schema change making
// imports/vendors optional - see ADR-0015's Alternatives section for why
// auto-provisioning keeps "every import has a vendor" a true invariant
// instead.
async function ensureRestockVendor(tenantId: string): Promise<void> {
  const vendorRef = getFirestore().doc(`tenants/${tenantId}/vendors/${RESTOCK_VENDOR_ID}`)
  const snap = await vendorRef.get()
  if (!snap.exists) {
    await vendorRef.set({
      name: 'Restock.ca (auto-imported)',
      manifestFormat: 'csv',
      createdAt: FieldValue.serverTimestamp(),
    })
  }
}

// PALLETIQ-041 / ADR-0015. Bridges a global restock_lots doc into a
// tenant-scoped import - never runs inline on a user-facing request,
// enqueueDiscoveredLotImport (the onCall) only enqueues this (governance
// Check II). Hands off to the existing, unmodified processManifestImport
// once the manifest is fetched, validated, and uploaded - this worker's
// only job is bridging the global->tenant boundary and the external fetch,
// not re-implementing manifest parsing.
export const importDiscoveredLotWorker = onTaskDispatched<ImportDiscoveredLotWorkerPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    timeoutSeconds: 120,
  },
  async (request) => {
    const { tenantId, importId, lotId } = request.data
    if (typeof tenantId !== 'string' || typeof importId !== 'string' || typeof lotId !== 'string') {
      logger.error('importDiscoveredLotWorker: invalid payload', request.data)
      return
    }

    const db = getFirestore()
    const importRef = db.doc(`tenants/${tenantId}/imports/${importId}`)

    try {
      const lotSnap = await db.doc(`restock_lots/${lotId}`).get()
      const lot = lotSnap.data() as RestockLotDoc | undefined
      if (!lot?.manifestUrl) {
        throw new Error('Discovered lot no longer has a manifest link.')
      }

      const fetched = await fetchAndValidateManifest(lot.manifestUrl)
      if (!fetched.ok) {
        throw new Error(fetched.error)
      }

      await ensureRestockVendor(tenantId)

      const storagePath = `tenants/${tenantId}/manifests/${importId}/original.${fetched.format}`
      await getStorage()
        .bucket()
        .file(storagePath)
        .save(fetched.buffer, { contentType: CONTENT_TYPE_BY_FORMAT[fetched.format] })

      await importRef.update({
        format: fetched.format,
        storagePath,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)

      await getFunctions()
        .taskQueue('processManifestImport')
        .enqueue({ tenantId, importId, storagePath, format: fetched.format })
    } catch (err) {
      await importRef.update({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)

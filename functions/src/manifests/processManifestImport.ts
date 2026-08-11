import { logger } from 'firebase-functions/v2'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { normalizeRow } from './normalize'
import { parseFile } from './parseFile'
import type { ImportDoc, ImportErrorDoc, InventoryDoc, LineItemDoc, ManifestFormat } from './types'

interface ProcessManifestImportPayload {
  tenantId?: unknown
  importId?: unknown
  storagePath?: unknown
  format?: unknown
}

// Basic sane limit for this ticket - PALLETIQ-012 owns the deeper hardening
// (magic-byte validation, malware scanning, rate limiting). 10 MB comfortably
// covers a few thousand manifest rows without leaving the door wide open.
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

// Firestore batched writes cap at 500 ops - leave headroom for the
// imports/{importId} status update sharing the same batch.
const BATCH_SIZE = 400

// PALLETIQ-008 / ADR-0006. Cloud-Tasks-dispatched worker, same shape as
// PALLETIQ-005's processDummyTask: mark processing, do the work, mark
// completed/failed. See ADR-0006 for why parsing happens here instead of
// client-side or via a Storage trigger.
export const processManifestImport = onTaskDispatched<ProcessManifestImportPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
  },
  async (request) => {
    const { tenantId, importId, storagePath, format } = request.data
    if (
      typeof tenantId !== 'string' ||
      typeof importId !== 'string' ||
      typeof storagePath !== 'string' ||
      (format !== 'csv' && format !== 'xlsx')
    ) {
      logger.error('processManifestImport: invalid payload', request.data)
      return
    }
    const manifestFormat: ManifestFormat = format

    const db = getFirestore()
    const importRef = db.doc(`tenants/${tenantId}/imports/${importId}`)

    try {
      const importSnap = await importRef.get()
      const vendorId = (importSnap.data() as ImportDoc | undefined)?.vendorId
      if (typeof vendorId !== 'string') {
        throw new Error('Import record is missing vendorId.')
      }

      await importRef.update({
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)

      const [buffer] = await getStorage().bucket().file(storagePath).download()
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        const maxMb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toString()
        throw new Error(`File exceeds the ${maxMb} MB size limit.`)
      }

      const rawRows = await parseFile(buffer, manifestFormat)

      const lineItemsRef = db.collection(`tenants/${tenantId}/manifests/${importId}/lineItems`)
      const errorsRef = db.collection(`tenants/${tenantId}/imports_errors`)
      const inventoryRef = db.collection(`tenants/${tenantId}/inventory`)

      let successCount = 0
      let errorCount = 0
      let batch = db.batch()
      let opsInBatch = 0

      const flushIfNeeded = async () => {
        if (opsInBatch >= BATCH_SIZE) {
          await batch.commit()
          batch = db.batch()
          opsInBatch = 0
        }
      }

      for (const [index, rawRow] of rawRows.entries()) {
        const rowNumber = index + 2 // +1 for 0-index, +1 for the header row
        const result = normalizeRow(rawRow)

        if ('lineItem' in result) {
          const lineItemRef = lineItemsRef.doc()
          batch.set(lineItemRef, result.lineItem satisfies LineItemDoc)
          // PALLETIQ-011 / ADR-0007 - a successful line item already
          // represents a completed purchase, so inventory is created here
          // rather than via a separate manual conversion step.
          batch.set(inventoryRef.doc(), {
            lineItemId: lineItemRef.id,
            manifestId: importId,
            vendorId,
            sku: result.lineItem.sku,
            upc: result.lineItem.upc,
            description: result.lineItem.description,
            quantity: result.lineItem.quantity,
            unitCost: result.lineItem.unitCost,
            condition: result.lineItem.condition,
            category: result.lineItem.category,
            status: 'purchased',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          } satisfies InventoryDoc)
          opsInBatch += 2
          successCount += 1
        } else {
          batch.set(errorsRef.doc(), {
            importId,
            rowNumber,
            rawRow,
            reason: result.error,
            createdAt: FieldValue.serverTimestamp(),
          } satisfies ImportErrorDoc)
          opsInBatch += 1
          errorCount += 1
        }
        await flushIfNeeded()
      }

      if (opsInBatch > 0) {
        await batch.commit()
      }

      await importRef.update({
        status: 'completed',
        rowCount: rawRows.length,
        successCount,
        errorCount,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)
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

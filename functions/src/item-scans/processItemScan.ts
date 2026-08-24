import { logger } from 'firebase-functions/v2'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { recordGeminiCalls } from '../billing/geminiUsage'
import { geminiApiKey } from '../gemini/params'
import { identifyItem } from '../gemini/identifyItem'
import type { PhotoInput } from '../gemini/identifyItem'
import type { ItemScanDoc } from './types'

interface ProcessItemScanPayload {
  tenantId?: unknown
  scanId?: unknown
}

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
}

function mimeTypeForPath(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  return MIME_TYPES_BY_EXTENSION[extension] ?? 'application/octet-stream'
}

// PALLETIQ-025 / ADR-0011. Cloud-Tasks-dispatched worker, same processing/
// completed/failed shape as processDummyTask/processManifestImport. The
// only new element is downloading multiple photos and making the one real
// Gemini call (identifyItem) - Governance Check II: this never runs inline
// on a user-facing request path.
export const processItemScan = onTaskDispatched<ProcessItemScanPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    // Vision + Google Search grounding over up to 5 photos runs noticeably
    // longer than a plain text call, same 512MiB ceiling as
    // processManifestImport (a handful of photo downloads, not a 50k-row
    // parse). PALLETIQ-036 lowered this from 300s: photos are now
    // client-compressed before upload (compressPhoto.ts), so the payload
    // this call actually handles is far smaller than the 300s ceiling was
    // originally sized for - and a real platform-enforced timeout doesn't
    // reach this function's own catch block, so a lower ceiling also
    // shrinks the worst-case silent-retry window (maxAttempts x this) from
    // ~15 minutes to ~6 minutes if a pathological case still occurs.
    memory: '512MiB',
    timeoutSeconds: 120,
    secrets: [geminiApiKey],
  },
  async (request) => {
    const { tenantId, scanId } = request.data
    if (typeof tenantId !== 'string' || typeof scanId !== 'string') {
      logger.error('processItemScan: invalid payload', request.data)
      return
    }

    const scanRef = getFirestore().doc(`tenants/${tenantId}/item_scans/${scanId}`)

    try {
      const scanSnap = await scanRef.get()
      const scanData = scanSnap.data() as ItemScanDoc | undefined
      const photoPaths = scanData?.photoPaths
      if (!photoPaths || photoPaths.length === 0) {
        throw new Error('Item scan record is missing photoPaths.')
      }

      await scanRef.update({
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)

      const bucket = getStorage().bucket()
      const photos: PhotoInput[] = await Promise.all(
        photoPaths.map(async (path) => {
          const [data] = await bucket.file(path).download()
          return { data, mimeType: mimeTypeForPath(path) }
        }),
      )

      const { candidates, selectedCandidateIndex } = await identifyItem(
        geminiApiKey.value(),
        photos,
      )
      await recordGeminiCalls(tenantId, 1)

      await scanRef.update({
        status: 'completed',
        candidates,
        selectedCandidateIndex,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
    } catch (err) {
      await scanRef.update({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)

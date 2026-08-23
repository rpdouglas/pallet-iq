import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { ItemScanDoc } from './types'

interface EnqueueItemScanRequest {
  scanId?: unknown
  photoPaths?: unknown
}

const MIN_PHOTOS = 1
const MAX_PHOTOS = 5

// PALLETIQ-025 / ADR-0011. scanId is client-generated, same reasoning as
// enqueueManifestImport's importId - the client must upload photos to
// Storage at tenants/{tenantId}/item_scans/{scanId}/... *before* calling
// this callable, so the server can't hand back an ID for a path that
// already needs to exist.
export const enqueueItemScan = onCall<EnqueueItemScanRequest, Promise<{ scanId: string }>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.')
    }

    const { tenantId, role } = request.auth.token
    if (typeof tenantId !== 'string') {
      throw new HttpsError('permission-denied', 'A tenant membership is required.')
    }
    if (role !== 'owner' && role !== 'buyer') {
      throw new HttpsError('permission-denied', 'Only an Owner or Buyer can scan items.')
    }

    const { scanId, photoPaths } = request.data
    if (typeof scanId !== 'string' || !scanId) {
      throw new HttpsError('invalid-argument', 'scanId is required.')
    }
    if (
      !Array.isArray(photoPaths) ||
      photoPaths.length < MIN_PHOTOS ||
      photoPaths.length > MAX_PHOTOS ||
      !photoPaths.every((path): path is string => typeof path === 'string' && path.length > 0)
    ) {
      throw new HttpsError(
        'invalid-argument',
        `photoPaths must be an array of ${MIN_PHOTOS.toString()} to ${MAX_PHOTOS.toString()} strings.`,
      )
    }

    const expectedPathPrefix = `tenants/${tenantId}/item_scans/${scanId}/`
    if (!photoPaths.every((path) => path.startsWith(expectedPathPrefix))) {
      throw new HttpsError(
        'invalid-argument',
        'photoPaths do not match the expected upload location.',
      )
    }

    const scanRef = getFirestore().doc(`tenants/${tenantId}/item_scans/${scanId}`)

    const scanDoc: ItemScanDoc = {
      status: 'queued',
      photoPaths,
      candidates: [],
      selectedCandidateIndex: null,
      error: null,
      pricingStatus: 'not_priced',
      pricing: null,
      pricingError: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await scanRef.set(scanDoc)
    await getFunctions().taskQueue('processItemScan').enqueue({ tenantId, scanId })

    return { scanId }
  },
)

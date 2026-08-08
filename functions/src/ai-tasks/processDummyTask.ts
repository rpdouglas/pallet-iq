import { logger } from 'firebase-functions/v2'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import type { AiTaskDoc } from './types'

interface ProcessDummyTaskPayload {
  tenantId?: unknown
  taskId?: unknown
}

// PALLETIQ-005 / ADR-0004. Cloud-Tasks-dispatched worker - proves the
// enqueue -> dispatch -> process -> write-back round-trip with a no-op
// payload. Phase 2 replaces the body between the two taskRef.update() calls
// with a real Gemini/Vertex call; this plumbing (status lifecycle, retry on
// failure) stays the same.
export const processDummyTask = onTaskDispatched<ProcessDummyTaskPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
  },
  async (request) => {
    const { tenantId, taskId } = request.data
    if (typeof tenantId !== 'string' || typeof taskId !== 'string') {
      logger.error('processDummyTask: invalid payload', request.data)
      return
    }

    const taskRef = getFirestore().doc(`tenants/${tenantId}/ai_tasks/${taskId}`)

    try {
      await taskRef.update({
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<AiTaskDoc>)

      await taskRef.update({
        status: 'completed',
        result: { echo: true },
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<AiTaskDoc>)
    } catch (err) {
      await taskRef.update({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<AiTaskDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)

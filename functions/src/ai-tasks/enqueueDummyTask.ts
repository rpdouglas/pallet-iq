import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { AiTaskDoc } from './types'

// PALLETIQ-005 / ADR-0004. Proves the async AI task queue end-to-end with a
// dummy task type - no real Gemini/Vertex call exists yet (that's Phase 2).
// tenantId always comes from the caller's signed claim, never request.data -
// same discipline as functions/src/auth/*.
export const enqueueDummyTask = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }

  const { tenantId } = request.auth.token
  if (typeof tenantId !== 'string') {
    throw new HttpsError('permission-denied', 'A tenant membership is required.')
  }

  const db = getFirestore()
  const taskRef = db.collection(`tenants/${tenantId}/ai_tasks`).doc()

  const taskDoc: AiTaskDoc = {
    type: 'dummy',
    status: 'queued',
    payload: {},
    result: null,
    error: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await taskRef.set(taskDoc)
  await getFunctions().taskQueue('processDummyTask').enqueue({ tenantId, taskId: taskRef.id })

  return { taskId: taskRef.id }
})

import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type AiTaskStatus = 'queued' | 'processing' | 'completed' | 'failed'

// tenants/{tenantId}/ai_tasks/{taskId} - Cloud-Functions-only, see
// firestore.rules. PALLETIQ-005 / ADR-0004. `type: 'dummy'` is the only
// task type that exists until Phase 2's real Gemini/Vertex task types land.
export interface AiTaskDoc {
  type: string
  status: AiTaskStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}

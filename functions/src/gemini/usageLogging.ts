import { logger } from 'firebase-functions/v2'
import type { GenerateContentResponse } from '@google/genai'

interface LogGeminiCallParams {
  callSite: string
  model: string
  grounded: boolean
  response: GenerateContentResponse
}

// PALLETIQ-045. Structured, queryable in Cloud Logging - the only way to
// see real $/call-site cost, since no billing export existed before this
// (docs/reports/2026-08-24-gemini-cost-audit.md). Fields picked off
// explicitly rather than spread - response.usageMetadata is a class
// instance (@google/genai), and spreading one loses its prototype.
// thoughtsTokenCount is included even though no thinkingConfig is set
// anywhere - it answers the report's open question of whether the model
// does hidden reasoning by default.
export function logGeminiCall({ callSite, model, grounded, response }: LogGeminiCallParams): void {
  const usage = response.usageMetadata
  logger.info('gemini_call', {
    callSite,
    model,
    grounded,
    promptTokenCount: usage?.promptTokenCount ?? null,
    candidatesTokenCount: usage?.candidatesTokenCount ?? null,
    toolUsePromptTokenCount: usage?.toolUsePromptTokenCount ?? null,
    thoughtsTokenCount: usage?.thoughtsTokenCount ?? null,
    totalTokenCount: usage?.totalTokenCount ?? null,
  })
}

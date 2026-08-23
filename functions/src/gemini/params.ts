import { defineSecret } from 'firebase-functions/params'

// PALLETIQ-025 / ADR-0011. First real Gemini API consumer in the codebase -
// PALLETIQ-004's convention note already anticipated this. Provisioned
// just-in-time via `firebase functions:secrets:set GEMINI_API_KEY`, per
// ADR-0005's "not upfront" convention.
export const geminiApiKey = defineSecret('GEMINI_API_KEY')

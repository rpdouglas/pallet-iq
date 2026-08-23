import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { CONDITION_GRADES } from '../item-scans/types'
import type { ItemScanCandidate } from '../item-scans/types'

const MODEL = 'gemini-3.6-flash'

// Confidence threshold above which the top candidate auto-resolves the
// scan; below it, the Buyer is shown the top candidates to pick from
// instead of a possibly-wrong single answer - per the plan's "say so when
// it doesn't know" section.
export const CONFIDENCE_THRESHOLD = 0.7

const candidateSchema = z.object({
  itemName: z.string().min(1),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  category: z.string().min(1),
  dimensions: z.string().nullable(),
  notableFeatures: z.string().nullable(),
  condition: z.enum(CONDITION_GRADES),
  conditionJustification: z.string().min(1),
  confidence: z.number().min(0).max(1),
})
const responseSchema = z.array(candidateSchema).min(1).max(3)

export interface PhotoInput {
  data: Buffer
  mimeType: string
}

const PROMPT = `You are an expert product identifier helping a liquidation/resale buyer figure out what an item is from photos before they decide whether to buy it.

You will be given 1-5 photos of a single physical item (overall shots, a label/tag close-up, a barcode, and/or damage close-ups). Identify the item and return your answer as a JSON array of 1 to 3 candidate matches, ranked from most to least likely.

Use the Google Search tool to verify brand/model details, current retail availability, and typical MSRP when the photos give you enough to search on (a visible brand name, model number, or barcode). Do not fabricate a search result you did not actually look up.

Each array element must be an object with exactly these fields:
- "itemName": short human-readable name for the item (string)
- "brand": the brand name, or null if not identifiable
- "model": the model name/number, or null if not identifiable
- "category": a general product category (string)
- "dimensions": approximate size/dimensions if visible or inferable, or null
- "notableFeatures": a short note on distinguishing features, or null
- "condition": exactly one of "new", "like_new", "good", "fair", "damaged_for_parts"
- "conditionJustification": one sentence citing what you saw (scuffs, missing parts, torn packaging, etc.)
- "confidence": your confidence in THIS candidate specifically, a number from 0 to 1

Return only 2 or 3 candidates when you are genuinely unsure between them; return exactly 1 when you are confident. Order the array from highest to lowest confidence.

Respond with ONLY the JSON array - no markdown code fences, no commentary, no leading or trailing text.`

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

export interface IdentifyItemResult {
  candidates: ItemScanCandidate[]
  selectedCandidateIndex: number | null
}

// PALLETIQ-025 / ADR-0011. The one real Gemini call in this feature -
// vision + Google Search grounding + a JSON-in-prompt response (not
// responseSchema/responseMimeType, which have had rough edges combined
// with tool use in past API versions - a plain-text response parsed and
// Zod-validated here is the safer, more portable choice). Governance
// Check II: this only ever runs inside processItemScan's Cloud-Tasks-
// dispatched worker, never inline on a user-facing request.
export async function identifyItem(
  apiKey: string,
  photos: PhotoInput[],
): Promise<IdentifyItemResult> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      PROMPT,
      ...photos.map((photo) => ({
        inlineData: { data: photo.data.toString('base64'), mimeType: photo.mimeType },
      })),
    ],
    config: {
      tools: [{ googleSearch: {} }],
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  const parsed: unknown = extractJsonArray(text)
  const result = responseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Gemini response did not match the expected schema: ${result.error.message}`)
  }

  const candidates = [...result.data].sort((a, b) => b.confidence - a.confidence)
  const selectedCandidateIndex = candidates[0].confidence >= CONFIDENCE_THRESHOLD ? 0 : null

  return { candidates, selectedCandidateIndex }
}

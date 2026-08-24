import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { ItemScanCandidate } from '../item-scans/types'
import type { PricingResult } from '../pricing/types'
import type { SaleabilityResult } from '../saleability/computeSaleability'

const MODEL = 'gemini-3.6-flash'

const listingCopyResponseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
})

export type ListingCopyResponse = z.infer<typeof listingCopyResponseSchema>

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

function buildPrompt(
  candidate: ItemScanCandidate,
  pricing: PricingResult,
  saleability: SaleabilityResult,
): string {
  const priceLine =
    pricing.salePrice !== null
      ? `Recommended asking price: $${pricing.salePrice.toFixed(2)} CAD${
          pricing.salePriceLow !== null && pricing.salePriceHigh !== null
            ? ` (range $${pricing.salePriceLow.toFixed(2)}-$${pricing.salePriceHigh.toFixed(2)})`
            : ''
        }`
      : 'No recommended asking price is available - do not invent one, and do not mention a specific price in the copy.'

  return `You are writing a marketplace resale listing (title + description) for a used/liquidation item, for a reseller in Ontario, Canada to post on a site like Kijiji, Facebook Marketplace, or eBay.

Item:
- Name: ${candidate.itemName}
- Brand: ${candidate.brand ?? 'unknown'}
- Model: ${candidate.model ?? 'unknown'}
- Category: ${candidate.category}
- Dimensions: ${candidate.dimensions ?? 'not specified'}
- Notable features: ${candidate.notableFeatures ?? 'none noted'}
- Condition: ${candidate.condition} - ${candidate.conditionJustification}

${priceLine}

Saleability notes (do not repeat these verbatim, use them only to calibrate tone - e.g. don't oversell a low-saleability item):
${saleability.factors.map((f) => `- ${f.label}`).join('\n')}

Write:
1. A "title": a concise, honest, marketplace-style listing title (searchable keywords first, under 80 characters if possible, no ALL CAPS, no excessive punctuation).
2. A "description": 2-4 short paragraphs a buyer would actually read - what it is, its condition (state any wear/damage honestly, don't hide it), and why it's a good buy. Do not fabricate features, specs, or history not given above. Do not promise a warranty, returns, or shipping unless told to.

Respond with ONLY a single JSON object (no markdown code fences, no commentary, no leading or trailing text) with exactly this shape:
{ "title": string, "description": string }`
}

// PALLETIQ-030 / ADR-0014. The third real Gemini call site in the codebase
// (after identifyItem.ts and priceResearch.ts) - a text-only call, no
// photos re-sent, using only the already-identified candidate fields plus
// the already-computed PricingResult/SaleabilityResult as input. No search
// grounding needed either - this is a writing task over data already
// gathered, not a research task. Governance Check II: only ever runs
// inside listingCopyWorker.ts's Cloud-Tasks-dispatched worker, never
// inline on a user-facing request - see that file.
export async function generateListingCopy(
  apiKey: string,
  candidate: ItemScanCandidate,
  pricing: PricingResult,
  saleability: SaleabilityResult,
): Promise<ListingCopyResponse> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [buildPrompt(candidate, pricing, saleability)],
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  const parsed: unknown = extractJsonObject(text)
  const result = listingCopyResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Gemini response did not match the expected schema: ${result.error.message}`)
  }
  return result.data
}

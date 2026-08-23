import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import type { ItemScanCandidate } from '../item-scans/types'

const MODEL = 'gemini-3.6-flash'

const compExampleSchema = z.object({
  title: z.string(),
  priceCad: z.number(),
  url: z.string().nullable(),
})

const listingBandSchema = z.object({
  low: z.number().nullable(),
  high: z.number().nullable(),
  sampleSize: z.number().int().min(0),
  examples: z.array(compExampleSchema),
})

export const priceResearchResponseSchema = z.object({
  retail: z.object({
    priceCad: z.number().nullable(),
    source: z.string().nullable(),
    url: z.string().nullable(),
  }),
  kijiji: z.object({
    newSealed: listingBandSchema,
    used: listingBandSchema,
  }),
  ebaySold: z.object({
    priceCad: z.number().nullable(),
    sampleSize: z.number().int().min(0),
    thin: z.boolean(),
    exchangeRateUsed: z.number().nullable(),
    examples: z.array(compExampleSchema),
  }),
  openBox: z.object({
    priceCad: z.number().nullable(),
    basis: z.enum(['listing', 'calculated']).nullable(),
  }),
  bottomLine: z.object({
    priceCad: z.number(),
    low: z.number(),
    high: z.number(),
    rationale: z.string().min(1),
  }),
  dataQuality: z.object({
    flags: z.array(z.string()),
  }),
})

export type PriceResearchResponse = z.infer<typeof priceResearchResponseSchema>

function buildPrompt(candidate: ItemScanCandidate): string {
  const identity = [
    `Item: ${candidate.itemName}`,
    candidate.brand ? `Brand: ${candidate.brand}` : null,
    candidate.model ? `Model: ${candidate.model}` : null,
    `Category: ${candidate.category}`,
    `Condition: ${candidate.condition} - ${candidate.conditionJustification}`,
    candidate.barcodeNumber ? `Barcode/UPC: ${candidate.barcodeNumber}` : null,
    candidate.groundedRetailPrice !== null
      ? `A prior identification pass found a possible retail price of $${candidate.groundedRetailPrice.toString()} CAD via ${candidate.groundedRetailSource ?? 'an unspecified source'} - treat this as a cross-check hint, not a final answer, and verify it yourself.`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  return `You are pricing a used/liquidation item for resale in Ontario, Canada, following a proven pricing-research process. All prices you report must be in CAD.

Item to price:
${identity}

Research process (follow in this order, using the Google Search tool to find pages and the URL context tool to actually read the direct page content rather than trusting search snippets):

1. New retail price (CAD): search Home Depot Canada / Canadian Tire / Amazon.ca for the direct product page. Fall back to the manufacturer's own site or a Costco seasonal flyer if none of those carry it. Fetch the actual product page, don't guess from a search snippet.
2. Kijiji Ontario comps: search Kijiji Ontario (province-wide, not just one city) for the same brand/model, both "brand new/sealed" and "used" listings separately. Search broad first ("[brand] [model]"), narrow to Eastern Ontario cities if volume is low. Record a representative low/high price band and a few example listings for each of new/sealed and used.
3. eBay sold/completed listings: search specifically for SOLD or COMPLETED listings, not active/asking listings, on eBay.ca (or eBay.com, converting USD to CAD at the current exchange rate - report the rate you used). This is normally the single best signal of a real clearing price. If you cannot access eBay's sold-listings pages at all (they may require sign-in and refuse anonymous access), do not fabricate a plausible-looking number - set ebaySold.thin to true, sampleSize to 0, and add a dataQuality flag explaining this rather than guessing.
4. Open-box/clearance estimate: use a direct open-box or clearance listing (Home Depot, Amazon Warehouse) if you find one. Otherwise calculate roughly 15-25% below the new retail price found in step 1.

Synthesis rules for the bottom-line recommended price:
- Start from the eBay sold/completed price if you found real sold data - it's the most reliable signal of what a real buyer actually pays.
- If eBay sold data is thin or unavailable, use the Kijiji Ontario "new/sealed" asking range as the primary anchor instead.
- The new retail price is a ceiling - the bottom-line price should sit meaningfully below it, typically 15-40% off depending on category, to read as a genuine deal. Adjust further down for used/worse-than-new condition.
- Used/private-sale Kijiji comps set the floor for anything not sealed/new.
- When sources conflict, weight the most recent listings and the most geographically relevant (Eastern Ontario over national averages) more heavily.
- Always state the bottom-line price as one specific number (plus a low/high band), never omit it even when data is thin - note the thinness in dataQuality.flags instead of refusing to give a number.
- Write a one-sentence rationale explaining which sources drove the bottom-line number.

Respond with ONLY a single JSON object (no markdown code fences, no commentary, no leading or trailing text) with exactly this shape:
{
  "retail": { "priceCad": number|null, "source": string|null, "url": string|null },
  "kijiji": {
    "newSealed": { "low": number|null, "high": number|null, "sampleSize": integer, "examples": [{ "title": string, "priceCad": number, "url": string|null }] },
    "used": { "low": number|null, "high": number|null, "sampleSize": integer, "examples": [{ "title": string, "priceCad": number, "url": string|null }] }
  },
  "ebaySold": { "priceCad": number|null, "sampleSize": integer, "thin": boolean, "exchangeRateUsed": number|null, "examples": [{ "title": string, "priceCad": number, "url": string|null }] },
  "openBox": { "priceCad": number|null, "basis": "listing"|"calculated"|null },
  "bottomLine": { "priceCad": number, "low": number, "high": number, "rationale": string },
  "dataQuality": { "flags": [string] }
}`
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

// PALLETIQ-035 / ADR-0012. Replaces the deterministic eBay/Keepa/
// PriceCharting/Discogs/Google Books waterfall with a single live-research
// Gemini call modeled on the owner's proven pricing SOP
// (docs/projects/SOP-Pricing-Research-v1.4.docx) - googleSearch finds
// candidate pages, urlContext actually fetches and reads them, matching
// the SOP's "search, then web_fetch the direct page" workflow rather than
// trusting search snippets. Same plain-JSON-in-prompt + Zod-validated
// pattern as identifyItem.ts, for the same reasons (responseSchema has had
// rough edges combined with tool use). Governance Check II: only ever runs
// inside priceItemScanWorker's Cloud-Tasks-dispatched worker, never inline
// on a user-facing request.
export async function researchPrice(
  apiKey: string,
  candidate: ItemScanCandidate,
): Promise<PriceResearchResponse> {
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [buildPrompt(candidate)],
    config: {
      tools: [{ googleSearch: {} }, { urlContext: {} }],
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  const parsed: unknown = extractJsonObject(text)
  const result = priceResearchResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Gemini response did not match the expected schema: ${result.error.message}`)
  }

  return result.data
}

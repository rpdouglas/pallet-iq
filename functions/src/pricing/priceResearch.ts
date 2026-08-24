import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { logGeminiCall } from '../gemini/usageLogging'
import type { ItemScanCandidate } from '../item-scans/types'

// PALLETIQ-047 attempted, reverted immediately - see
// gemini/identifyItem.ts's identical comment for why.
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

// PALLETIQ-038 / ADR-0013. The overall response shape is unchanged from
// PALLETIQ-035/ADR-0012 - mapPriceResearch.ts and everything downstream
// still consumes one merged PriceResearchResponse. Only how it gets
// assembled changes: three concurrent research legs (retail+openBox,
// kijiji, ebaySold) merged in code, plus a fourth tools-free synthesis
// call for bottomLine/dataQuality, instead of one sequential call doing
// all of it in a single model turn.
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

// Per-leg partial schemas/types - each research leg only returns its own
// slice, validated narrowly so one leg's malformed JSON doesn't sink the
// other two (see settleLeg's fallback-to-default behavior below).
const retailOpenBoxLegSchema = z.object({
  retail: z.object({
    priceCad: z.number().nullable(),
    source: z.string().nullable(),
    url: z.string().nullable(),
  }),
  openBox: z.object({
    priceCad: z.number().nullable(),
    basis: z.enum(['listing', 'calculated']).nullable(),
  }),
})
export type RetailOpenBoxLeg = z.infer<typeof retailOpenBoxLegSchema>

const kijijiLegSchema = z.object({
  newSealed: listingBandSchema,
  used: listingBandSchema,
})
export type KijijiLeg = z.infer<typeof kijijiLegSchema>

const ebaySoldLegSchema = z.object({
  priceCad: z.number().nullable(),
  sampleSize: z.number().int().min(0),
  thin: z.boolean(),
  exchangeRateUsed: z.number().nullable(),
  examples: z.array(compExampleSchema),
})
export type EbaySoldLeg = z.infer<typeof ebaySoldLegSchema>

// PALLETIQ-045. Persisted onto ItemScanDoc.pricingResearchLegs as soon as
// each leg succeeds - a Cloud Tasks retry after a synthesis-only failure
// reads this back and skips any leg already present here, rather than
// re-paying for 3 already-successful grounded research calls. Only ever
// holds a leg that genuinely succeeded (see settleLeg's flag) - a failed
// leg's fallback default is never persisted here, so it's correctly
// retried, not silently treated as done.
export interface PricingResearchLegs {
  retailOpenBox: RetailOpenBoxLeg | null
  kijiji: KijijiLeg | null
  ebaySold: EbaySoldLeg | null
}

const synthesisResponseSchema = z.object({
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

// A leg that genuinely fails (Gemini error, schema mismatch, timeout)
// degrades to the same null/empty/thin shape the SOP already uses for "this
// leg found nothing" - not a thrown error that would sink the whole price.
const DEFAULT_RETAIL_OPEN_BOX: RetailOpenBoxLeg = {
  retail: { priceCad: null, source: null, url: null },
  openBox: { priceCad: null, basis: null },
}
const DEFAULT_KIJIJI: KijijiLeg = {
  newSealed: { low: null, high: null, sampleSize: 0, examples: [] },
  used: { low: null, high: null, sampleSize: 0, examples: [] },
}
const DEFAULT_EBAY_SOLD: EbaySoldLeg = {
  priceCad: null,
  sampleSize: 0,
  thin: true,
  exchangeRateUsed: null,
  examples: [],
}

function buildIdentityBlock(candidate: ItemScanCandidate): string {
  return [
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
}

function buildRetailOpenBoxPrompt(candidate: ItemScanCandidate): string {
  return `You are researching the new retail price and an open-box/clearance estimate for a used/liquidation item being resold in Ontario, Canada, following a proven pricing-research process. All prices you report must be in CAD.

Item to price:
${buildIdentityBlock(candidate)}

Research process (using the Google Search tool to find pages and the URL context tool to actually read the direct page content rather than trusting search snippets):

1. New retail price (CAD): search Home Depot Canada / Canadian Tire / Amazon.ca for the direct product page. Fall back to the manufacturer's own site or a Costco seasonal flyer if none of those carry it. Fetch the actual product page, don't guess from a search snippet.
2. Open-box/clearance estimate: use a direct open-box or clearance listing (Home Depot, Amazon Warehouse) if you find one. Otherwise calculate roughly 15-25% below the new retail price you found in step 1.

Respond with ONLY a single JSON object (no markdown code fences, no commentary, no leading or trailing text) with exactly this shape:
{
  "retail": { "priceCad": number|null, "source": string|null, "url": string|null },
  "openBox": { "priceCad": number|null, "basis": "listing"|"calculated"|null }
}`
}

function buildKijijiPrompt(candidate: ItemScanCandidate): string {
  return `You are researching Kijiji Ontario comps for a used/liquidation item being resold in Ontario, Canada, following a proven pricing-research process. All prices you report must be in CAD.

Item to price:
${buildIdentityBlock(candidate)}

Research process (using the Google Search tool to find pages and the URL context tool to actually read the direct page content rather than trusting search snippets):

Search Kijiji Ontario (province-wide, not just one city) for the same brand/model, both "brand new/sealed" and "used" listings separately. Search broad first ("[brand] [model]"), narrow to Eastern Ontario cities if volume is low. Record a representative low/high price band and a few example listings for each of new/sealed and used.

Respond with ONLY a single JSON object (no markdown code fences, no commentary, no leading or trailing text) with exactly this shape:
{
  "newSealed": { "low": number|null, "high": number|null, "sampleSize": integer, "examples": [{ "title": string, "priceCad": number, "url": string|null }] },
  "used": { "low": number|null, "high": number|null, "sampleSize": integer, "examples": [{ "title": string, "priceCad": number, "url": string|null }] }
}`
}

function buildEbaySoldPrompt(candidate: ItemScanCandidate): string {
  return `You are researching eBay sold/completed listings for a used/liquidation item being resold in Ontario, Canada, following a proven pricing-research process. All prices you report must be in CAD.

Item to price:
${buildIdentityBlock(candidate)}

Research process (using the Google Search tool to find pages and the URL context tool to actually read the direct page content rather than trusting search snippets):

Search specifically for SOLD or COMPLETED listings, not active/asking listings, on eBay.ca (or eBay.com, converting USD to CAD at the current exchange rate - report the rate you used). This is normally the single best signal of a real clearing price. If you cannot access eBay's sold-listings pages at all (they may require sign-in and refuse anonymous access), do not fabricate a plausible-looking number - set thin to true and sampleSize to 0.

Respond with ONLY a single JSON object (no markdown code fences, no commentary, no leading or trailing text) with exactly this shape:
{
  "priceCad": number|null, "sampleSize": integer, "thin": boolean, "exchangeRateUsed": number|null, "examples": [{ "title": string, "priceCad": number, "url": string|null }]
}`
}

export interface MergedLegs {
  retail: PriceResearchResponse['retail']
  openBox: PriceResearchResponse['openBox']
  kijiji: PriceResearchResponse['kijiji']
  ebaySold: PriceResearchResponse['ebaySold']
}

function buildSynthesisPrompt(
  candidate: ItemScanCandidate,
  merged: MergedLegs,
  legFailureFlags: string[],
): string {
  const gapsLine =
    legFailureFlags.length > 0 ? `\nKnown research gaps: ${legFailureFlags.join('; ')}` : ''

  return `You are synthesizing a bottom-line resale price recommendation in CAD for a used/liquidation item being resold in Ontario, Canada, following a proven pricing-research process. The research has already been done - use ONLY the structured data below, do not search for anything new.

Item condition: ${candidate.condition} - ${candidate.conditionJustification}

Research findings (JSON):
${JSON.stringify(merged, null, 2)}${gapsLine}

Synthesis rules:
- Start from the eBay sold/completed price if found - it's the most reliable signal of what a real buyer actually pays.
- If eBay sold data is thin or unavailable, use the Kijiji Ontario "new/sealed" asking range as the primary anchor instead.
- The new retail price is a ceiling - the bottom-line price should sit meaningfully below it, typically 15-40% off depending on category, to read as a genuine deal. Adjust further down for used/worse-than-new condition.
- Used/private-sale Kijiji comps set the floor for anything not sealed/new.
- When sources conflict, weight the most recent listings and the most geographically relevant (Eastern Ontario over national averages) more heavily.
- Always state the bottom-line price as one specific number (plus a low/high band), never omit it even when data is thin - note the thinness in dataQuality.flags instead of refusing to give a number.
- Write a one-sentence rationale explaining which sources drove the bottom-line number.
- If you notice any additional data-quality issues in the findings above (e.g. sources significantly disagree, all bands are extremely wide), add a short flag describing it - don't repeat the "Known research gaps" already listed above, if any.

Respond with ONLY a single JSON object (no markdown code fences, no commentary, no leading or trailing text) with exactly this shape:
{
  "bottomLine": { "priceCad": number, "low": number, "high": number, "rationale": string },
  "dataQuality": { "flags": [string] }
}`
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

async function runLeg<T>(
  ai: GoogleGenAI,
  prompt: string,
  schema: z.ZodType<T>,
  useTools: boolean,
  legName: string,
): Promise<T> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [prompt],
    config: useTools ? { tools: [{ googleSearch: {} }, { urlContext: {} }] } : {},
  })

  logGeminiCall({ callSite: legName, model: MODEL, grounded: useTools, response })

  const text = response.text
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  const parsed: unknown = extractJsonObject(text)
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Gemini response did not match the expected schema: ${result.error.message}`)
  }
  return result.data
}

function settleLeg<T>(
  settled: PromiseSettledResult<T>,
  legName: string,
  fallback: T,
): { data: T; flag: string | null } {
  if (settled.status === 'fulfilled') {
    return { data: settled.value, flag: null }
  }
  const message = settled.reason instanceof Error ? settled.reason.message : String(settled.reason)
  return { data: fallback, flag: `${legName} research failed: ${message}` }
}

export interface PricingLegsResult {
  merged: MergedLegs
  legs: PricingResearchLegs
  legFailureFlags: string[]
  /** How many new Gemini calls this invocation actually made (0-3) - legs
   * reused from `previousLegs` don't count, since no call was made for them. */
  callsMade: number
}

// PALLETIQ-035/038/045 / ADR-0012/0013. Replaces the deterministic eBay/
// Keepa/PriceCharting/Discogs/Google Books waterfall with live-research
// Gemini calls modeled on the owner's proven pricing SOP
// (docs/projects/SOP-Pricing-Research-v1.4.docx). Originally one
// sequential call doing all five SOP steps in a single model turn
// (PALLETIQ-035); split by PALLETIQ-038/ADR-0013 into three concurrent
// research legs (retail+openBox, kijiji, ebaySold - each independent per
// the SOP, run via Promise.allSettled so one leg's failure degrades to
// null/empty/thin rather than sinking the whole price). Split again by
// PALLETIQ-045 from a single researchPrice() into this function plus
// synthesizePricing() below: the old all-in-one shape meant a synthesis-
// only failure on Cloud Tasks retry re-ran all 3 already-successful,
// already-paid grounded research legs from scratch (worst case 12 Gemini
// calls for one logical price, 9 of them wasted -
// docs/reports/2026-08-24-gemini-cost-audit.md). `previousLegs` (read from
// ItemScanDoc.pricingResearchLegs by the caller) lets a retry skip any leg
// that already succeeded. Governance Check II: only ever runs inside
// priceItemScanWorker's Cloud-Tasks-dispatched worker, never inline on a
// user-facing request.
export async function researchPricingLegs(
  apiKey: string,
  candidate: ItemScanCandidate,
  previousLegs: PricingResearchLegs | null,
): Promise<PricingLegsResult> {
  const ai = new GoogleGenAI({ apiKey })
  let callsMade = 0

  function runOrReuse<T>(
    previous: T | null | undefined,
    prompt: string,
    schema: z.ZodType<T>,
    legName: string,
  ): Promise<T> {
    if (previous) {
      return Promise.resolve(previous)
    }
    callsMade += 1
    return runLeg(ai, prompt, schema, true, legName)
  }

  const [retailOpenBoxSettled, kijijiSettled, ebaySoldSettled] = await Promise.allSettled([
    runOrReuse(
      previousLegs?.retailOpenBox,
      buildRetailOpenBoxPrompt(candidate),
      retailOpenBoxLegSchema,
      'priceResearch:retailOpenBox',
    ),
    runOrReuse(
      previousLegs?.kijiji,
      buildKijijiPrompt(candidate),
      kijijiLegSchema,
      'priceResearch:kijiji',
    ),
    runOrReuse(
      previousLegs?.ebaySold,
      buildEbaySoldPrompt(candidate),
      ebaySoldLegSchema,
      'priceResearch:ebaySold',
    ),
  ])

  const retailOpenBox = settleLeg(retailOpenBoxSettled, 'Retail/open-box', DEFAULT_RETAIL_OPEN_BOX)
  const kijiji = settleLeg(kijijiSettled, 'Kijiji', DEFAULT_KIJIJI)
  const ebaySold = settleLeg(ebaySoldSettled, 'eBay sold', DEFAULT_EBAY_SOLD)

  const legFailureFlags = [retailOpenBox.flag, kijiji.flag, ebaySold.flag].filter(
    (flag): flag is string => flag !== null,
  )

  const merged: MergedLegs = {
    retail: retailOpenBox.data.retail,
    openBox: retailOpenBox.data.openBox,
    kijiji: kijiji.data,
    ebaySold: ebaySold.data,
  }

  return {
    merged,
    // Only a genuinely-succeeded leg is persisted (flag === null) - a
    // failed leg's fallback default must never be treated as "done" on a
    // later retry, or it would silently never be retried.
    legs: {
      retailOpenBox: retailOpenBox.flag === null ? retailOpenBox.data : null,
      kijiji: kijiji.flag === null ? kijiji.data : null,
      ebaySold: ebaySold.flag === null ? ebaySold.data : null,
    },
    legFailureFlags,
    callsMade,
  }
}

// No fallback here, deliberately - a synthesis failure still fails the
// whole price (there's no bottom line without it), same all-or-nothing
// behavior the single-call design already had for this one step. Left to
// throw so priceItemScanWorker.ts's existing catch/retry handles it - a
// retry only re-runs this cheap, tools-free call, never the 3 research
// legs above (see PricingLegsResult/previousLegs).
export async function synthesizePricing(
  apiKey: string,
  candidate: ItemScanCandidate,
  merged: MergedLegs,
  legFailureFlags: string[],
): Promise<PriceResearchResponse> {
  const ai = new GoogleGenAI({ apiKey })

  const synthesis = await runLeg(
    ai,
    buildSynthesisPrompt(candidate, merged, legFailureFlags),
    synthesisResponseSchema,
    false,
    'priceResearch:synthesis',
  )

  const finalResponse: PriceResearchResponse = {
    ...merged,
    bottomLine: synthesis.bottomLine,
    dataQuality: { flags: [...legFailureFlags, ...synthesis.dataQuality.flags] },
  }

  const validated = priceResearchResponseSchema.safeParse(finalResponse)
  if (!validated.success) {
    throw new Error(
      `Merged pricing response did not match the expected schema: ${validated.error.message}`,
    )
  }
  return validated.data
}

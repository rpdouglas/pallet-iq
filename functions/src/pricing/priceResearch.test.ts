import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent }
  },
}))

vi.mock('firebase-functions/v2', () => ({
  logger: { info: vi.fn() },
}))

const { researchPricingLegs, synthesizePricing } = await import('./priceResearch')
import type { MergedLegs } from './priceResearch'

const CANDIDATE = {
  itemName: 'DeWalt 20V Cordless Drill',
  brand: 'DeWalt',
  model: 'DCD777',
  category: 'Tools',
  dimensions: null,
  notableFeatures: null,
  condition: 'good' as const,
  conditionJustification: 'Light wear on housing, fully functional.',
  confidence: 0.9,
  barcodeNumber: '885911234567',
  groundedRetailPrice: 179.99,
  groundedRetailSource: 'canadiantire.ca',
}

const RETAIL_OPEN_BOX_LEG = {
  retail: { priceCad: 179.99, source: 'canadiantire.ca', url: 'https://canadiantire.ca/x' },
  openBox: { priceCad: 145, basis: 'calculated' as const },
}

const KIJIJI_LEG = {
  newSealed: {
    low: 130,
    high: 150,
    sampleSize: 3,
    examples: [{ title: 'DeWalt DCD drill new', priceCad: 140, url: 'https://kijiji.ca/x' }],
  },
  used: {
    low: 80,
    high: 110,
    sampleSize: 5,
    examples: [{ title: 'DeWalt DCD drill used', priceCad: 95, url: 'https://kijiji.ca/y' }],
  },
}

const EBAY_SOLD_LEG = {
  priceCad: 105,
  sampleSize: 4,
  thin: false,
  exchangeRateUsed: 1.35,
  examples: [{ title: 'DeWalt DCD sold', priceCad: 105, url: 'https://ebay.ca/x' }],
}

const MERGED: MergedLegs = {
  retail: RETAIL_OPEN_BOX_LEG.retail,
  openBox: RETAIL_OPEN_BOX_LEG.openBox,
  kijiji: KIJIJI_LEG,
  ebaySold: EBAY_SOLD_LEG,
}

const SYNTHESIS_RESPONSE = {
  bottomLine: { priceCad: 100, low: 85, high: 115, rationale: 'Anchored on eBay sold comps.' },
  dataQuality: { flags: [] },
}

function jsonResponse(value: unknown) {
  return { text: JSON.stringify(value) }
}

function queueLegsHappyPath() {
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(RETAIL_OPEN_BOX_LEG))
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
}

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('researchPricingLegs', () => {
  it('runs all three research legs when there are no previous legs, merged into the response shape', async () => {
    queueLegsHappyPath()

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.merged).toEqual(MERGED)
    expect(result.legs).toEqual({
      retailOpenBox: RETAIL_OPEN_BOX_LEG,
      kijiji: KIJIJI_LEG,
      ebaySold: EBAY_SOLD_LEG,
    })
    expect(result.legFailureFlags).toEqual([])
    expect(result.callsMade).toBe(3)
    expect(mockGenerateContent).toHaveBeenCalledTimes(3)
  })

  it('enables Google Search + URL context for all three research legs', async () => {
    queueLegsHappyPath()

    await researchPricingLegs('fake-key', CANDIDATE, null)

    const calls = mockGenerateContent.mock.calls as { config: { tools?: unknown[] } }[][]
    for (const call of calls) {
      expect(call[0].config.tools).toEqual([{ googleSearch: {} }, { urlContext: {} }])
    }
  })

  it('includes the candidate identity in each research leg prompt', async () => {
    queueLegsHappyPath()

    await researchPricingLegs('fake-key', CANDIDATE, null)

    const calls = mockGenerateContent.mock.calls as { contents: string[] }[][]
    for (const call of calls) {
      expect(call[0].contents[0]).toContain('DeWalt 20V Cordless Drill')
      expect(call[0].contents[0]).toContain('885911234567')
    }
  })

  it('skips a leg already present in previousLegs - no Gemini call for it', async () => {
    // Only kijiji and ebaySold need to run; retail/open-box is reused.
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))

    const result = await researchPricingLegs('fake-key', CANDIDATE, {
      retailOpenBox: RETAIL_OPEN_BOX_LEG,
      kijiji: null,
      ebaySold: null,
    })

    expect(result.merged).toEqual(MERGED)
    expect(result.callsMade).toBe(2)
    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
  })

  it('makes zero Gemini calls when all three legs are already present in previousLegs', async () => {
    const result = await researchPricingLegs('fake-key', CANDIDATE, {
      retailOpenBox: RETAIL_OPEN_BOX_LEG,
      kijiji: KIJIJI_LEG,
      ebaySold: EBAY_SOLD_LEG,
    })

    expect(result.merged).toEqual(MERGED)
    expect(result.callsMade).toBe(0)
    expect(mockGenerateContent).not.toHaveBeenCalled()
  })

  it('falls back to null/empty defaults and adds a flag when one leg fails', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(RETAIL_OPEN_BOX_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockRejectedValueOnce(new Error('network timeout'))

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.merged.ebaySold).toEqual({
      priceCad: null,
      sampleSize: 0,
      thin: true,
      exchangeRateUsed: null,
      examples: [],
    })
    expect(result.legFailureFlags).toContainEqual(
      expect.stringContaining('eBay sold research failed: network timeout'),
    )
    expect(result.merged.retail).toEqual(RETAIL_OPEN_BOX_LEG.retail)
  })

  it('never persists a failed leg as though it succeeded - it stays null so a retry retries it', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(RETAIL_OPEN_BOX_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockRejectedValueOnce(new Error('network timeout'))

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.legs.ebaySold).toBeNull()
    expect(result.legs.retailOpenBox).toEqual(RETAIL_OPEN_BOX_LEG)
    expect(result.legs.kijiji).toEqual(KIJIJI_LEG)
  })

  it('degrades all three legs to defaults when all fail', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('retail down'))
    mockGenerateContent.mockRejectedValueOnce(new Error('kijiji down'))
    mockGenerateContent.mockRejectedValueOnce(new Error('ebay down'))

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.merged.retail.priceCad).toBeNull()
    expect(result.merged.kijiji.newSealed.sampleSize).toBe(0)
    expect(result.merged.ebaySold.thin).toBe(true)
    expect(result.legFailureFlags).toHaveLength(3)
    expect(result.legs).toEqual({ retailOpenBox: null, kijiji: null, ebaySold: null })
  })

  it('treats a leg whose response fails schema validation the same as a rejected leg', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse({ not: 'the right shape' }))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.merged.retail.priceCad).toBeNull()
    expect(result.legFailureFlags).toContainEqual(
      expect.stringContaining('Retail/open-box research failed'),
    )
  })

  it('strips a markdown code fence around a leg response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n' + JSON.stringify(RETAIL_OPEN_BOX_LEG) + '\n```',
    })
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.merged.retail).toEqual(RETAIL_OPEN_BOX_LEG.retail)
  })

  it('treats an empty-text leg response as a failure, falling back gracefully', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: undefined })
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))

    const result = await researchPricingLegs('fake-key', CANDIDATE, null)

    expect(result.merged.retail.priceCad).toBeNull()
    expect(result.legFailureFlags).toContainEqual(
      expect.stringContaining(
        'Retail/open-box research failed: Gemini returned an empty response.',
      ),
    )
  })
})

describe('synthesizePricing', () => {
  it('runs the synthesis call with no tools and merges into the full response shape', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))

    const result = await synthesizePricing('fake-key', CANDIDATE, MERGED, [])

    expect(result).toEqual({
      ...MERGED,
      bottomLine: SYNTHESIS_RESPONSE.bottomLine,
      dataQuality: { flags: [] },
    })
    const call = mockGenerateContent.mock.calls[0][0] as { config: { tools?: unknown[] } }
    expect(call.config.tools).toBeUndefined()
  })

  it('passes the merged findings and condition into the synthesis prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))

    await synthesizePricing('fake-key', CANDIDATE, MERGED, [])

    const call = mockGenerateContent.mock.calls[0][0] as { contents: string[] }
    expect(call.contents[0]).toContain('good - Light wear on housing')
    expect(call.contents[0]).toContain('"priceCad": 179.99')
    expect(call.contents[0]).toContain('"priceCad": 105')
  })

  it('merges code-generated leg-failure flags with synthesis-reported flags', async () => {
    mockGenerateContent.mockResolvedValueOnce(
      jsonResponse({
        bottomLine: SYNTHESIS_RESPONSE.bottomLine,
        dataQuality: { flags: ['Sources disagree by a wide margin'] },
      }),
    )

    const result = await synthesizePricing('fake-key', CANDIDATE, MERGED, [
      'Retail/open-box research failed: retail down',
    ])

    expect(result.dataQuality.flags).toEqual([
      'Retail/open-box research failed: retail down',
      'Sources disagree by a wide margin',
    ])
  })

  it('does not fall back and rejects when the synthesis call itself fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('synthesis call failed'))

    await expect(synthesizePricing('fake-key', CANDIDATE, MERGED, [])).rejects.toThrow(
      'synthesis call failed',
    )
  })
})

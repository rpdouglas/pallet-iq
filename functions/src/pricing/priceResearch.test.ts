import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent }
  },
}))

const { researchPrice } = await import('./priceResearch')

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

const SYNTHESIS_RESPONSE = {
  bottomLine: { priceCad: 100, low: 85, high: 115, rationale: 'Anchored on eBay sold comps.' },
  dataQuality: { flags: [] },
}

function jsonResponse(value: unknown) {
  return { text: JSON.stringify(value) }
}

function queueHappyPath() {
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(RETAIL_OPEN_BOX_LEG))
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
  mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))
}

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('researchPrice', () => {
  it('runs three research legs plus a synthesis call, merged into the full response shape', async () => {
    queueHappyPath()

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result).toEqual({
      retail: RETAIL_OPEN_BOX_LEG.retail,
      openBox: RETAIL_OPEN_BOX_LEG.openBox,
      kijiji: KIJIJI_LEG,
      ebaySold: EBAY_SOLD_LEG,
      bottomLine: SYNTHESIS_RESPONSE.bottomLine,
      dataQuality: { flags: [] },
    })
    expect(mockGenerateContent).toHaveBeenCalledTimes(4)
  })

  it('enables Google Search + URL context for the three research legs, but not the synthesis call', async () => {
    queueHappyPath()

    await researchPrice('fake-key', CANDIDATE)

    const calls = mockGenerateContent.mock.calls as { config: { tools?: unknown[] } }[][]
    const toolsPerCall = calls.map((call) => call[0].config.tools)
    expect(toolsPerCall[0]).toEqual([{ googleSearch: {} }, { urlContext: {} }])
    expect(toolsPerCall[1]).toEqual([{ googleSearch: {} }, { urlContext: {} }])
    expect(toolsPerCall[2]).toEqual([{ googleSearch: {} }, { urlContext: {} }])
    expect(toolsPerCall[3]).toBeUndefined()
  })

  it('includes the candidate identity in each research leg prompt', async () => {
    queueHappyPath()

    await researchPrice('fake-key', CANDIDATE)

    const calls = mockGenerateContent.mock.calls as { contents: string[] }[][]
    for (const call of calls.slice(0, 3)) {
      expect(call[0].contents[0]).toContain('DeWalt 20V Cordless Drill')
      expect(call[0].contents[0]).toContain('885911234567')
    }
  })

  it('passes the merged findings and condition into the synthesis prompt', async () => {
    queueHappyPath()

    await researchPrice('fake-key', CANDIDATE)

    const synthesisCall = mockGenerateContent.mock.calls[3][0] as { contents: string[] }
    expect(synthesisCall.contents[0]).toContain('good - Light wear on housing')
    expect(synthesisCall.contents[0]).toContain('"priceCad": 179.99')
    expect(synthesisCall.contents[0]).toContain('"priceCad": 105')
  })

  it('falls back to null/empty defaults and adds a flag when one leg fails, but still synthesizes a price', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(RETAIL_OPEN_BOX_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockRejectedValueOnce(new Error('network timeout'))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result.ebaySold).toEqual({
      priceCad: null,
      sampleSize: 0,
      thin: true,
      exchangeRateUsed: null,
      examples: [],
    })
    expect(result.dataQuality.flags).toContainEqual(
      expect.stringContaining('eBay sold research failed: network timeout'),
    )
    expect(result.retail).toEqual(RETAIL_OPEN_BOX_LEG.retail)
    expect(result.bottomLine).toEqual(SYNTHESIS_RESPONSE.bottomLine)
  })

  it('degrades all three legs to defaults when all fail, and still calls synthesis', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('retail down'))
    mockGenerateContent.mockRejectedValueOnce(new Error('kijiji down'))
    mockGenerateContent.mockRejectedValueOnce(new Error('ebay down'))
    mockGenerateContent.mockResolvedValueOnce(
      jsonResponse({
        bottomLine: { priceCad: 20, low: 15, high: 25, rationale: 'Best-effort, all legs thin.' },
        dataQuality: { flags: [] },
      }),
    )

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result.retail.priceCad).toBeNull()
    expect(result.kijiji.newSealed.sampleSize).toBe(0)
    expect(result.ebaySold.thin).toBe(true)
    expect(result.dataQuality.flags).toHaveLength(3)
    expect(result.bottomLine.priceCad).toBe(20)
    expect(mockGenerateContent).toHaveBeenCalledTimes(4)
  })

  it('treats a leg whose response fails schema validation the same as a rejected leg', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse({ not: 'the right shape' }))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result.retail.priceCad).toBeNull()
    expect(result.dataQuality.flags).toContainEqual(
      expect.stringContaining('Retail/open-box research failed'),
    )
  })

  it('merges code-generated leg-failure flags with synthesis-reported flags', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('retail down'))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
    mockGenerateContent.mockResolvedValueOnce(
      jsonResponse({
        bottomLine: SYNTHESIS_RESPONSE.bottomLine,
        dataQuality: { flags: ['Sources disagree by a wide margin'] },
      }),
    )

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result.dataQuality.flags).toEqual([
      expect.stringContaining('Retail/open-box research failed'),
      'Sources disagree by a wide margin',
    ])
  })

  it('does not fall back and rejects when the synthesis call itself fails', async () => {
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(RETAIL_OPEN_BOX_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
    mockGenerateContent.mockRejectedValueOnce(new Error('synthesis call failed'))

    await expect(researchPrice('fake-key', CANDIDATE)).rejects.toThrow('synthesis call failed')
  })

  it('strips a markdown code fence around a leg response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n' + JSON.stringify(RETAIL_OPEN_BOX_LEG) + '\n```',
    })
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result.retail).toEqual(RETAIL_OPEN_BOX_LEG.retail)
  })

  it('treats an empty-text leg response as a failure, falling back gracefully', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: undefined })
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(KIJIJI_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(EBAY_SOLD_LEG))
    mockGenerateContent.mockResolvedValueOnce(jsonResponse(SYNTHESIS_RESPONSE))

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result.retail.priceCad).toBeNull()
    expect(result.dataQuality.flags).toContainEqual(
      expect.stringContaining(
        'Retail/open-box research failed: Gemini returned an empty response.',
      ),
    )
  })
})

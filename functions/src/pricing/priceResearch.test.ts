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
  model: 'DCD host777',
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

const FULL_RESPONSE = {
  retail: { priceCad: 179.99, source: 'canadiantire.ca', url: 'https://canadiantire.ca/x' },
  kijiji: {
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
  },
  ebaySold: {
    priceCad: 105,
    sampleSize: 4,
    thin: false,
    exchangeRateUsed: 1.35,
    examples: [{ title: 'DeWalt DCD sold', priceCad: 105, url: 'https://ebay.ca/x' }],
  },
  openBox: { priceCad: 145, basis: 'calculated' as const },
  bottomLine: { priceCad: 100, low: 85, high: 115, rationale: 'Anchored on eBay sold comps.' },
  dataQuality: { flags: [] },
}

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('researchPrice', () => {
  it('parses a plain JSON object response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(FULL_RESPONSE) })

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result).toEqual(FULL_RESPONSE)
  })

  it('strips a markdown code fence around the JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n' + JSON.stringify(FULL_RESPONSE) + '\n```',
    })

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result).toEqual(FULL_RESPONSE)
  })

  it('enables Google Search grounding and URL context together', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(FULL_RESPONSE) })

    await researchPrice('fake-key', CANDIDATE)

    const call = mockGenerateContent.mock.calls[0][0] as { config: { tools: unknown[] } }
    expect(call.config.tools).toEqual([{ googleSearch: {} }, { urlContext: {} }])
  })

  it('includes the candidate identity and grounded retail price hint in the prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(FULL_RESPONSE) })

    await researchPrice('fake-key', CANDIDATE)

    const call = mockGenerateContent.mock.calls[0][0] as { contents: string[] }
    expect(call.contents[0]).toContain('DeWalt 20V Cordless Drill')
    expect(call.contents[0]).toContain('885911234567')
    expect(call.contents[0]).toContain('179.99')
    expect(call.contents[0]).toContain('cross-check hint')
  })

  it('throws when Gemini returns an empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: undefined })

    await expect(researchPrice('fake-key', CANDIDATE)).rejects.toThrow(/empty response/i)
  })

  it('throws when the response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json at all' })

    await expect(researchPrice('fake-key', CANDIDATE)).rejects.toThrow()
  })

  it('throws when the response JSON does not match the expected schema', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ retail: {} }) })

    await expect(researchPrice('fake-key', CANDIDATE)).rejects.toThrow(/schema/i)
  })

  it('accepts a response with all-null/thin signal (no data found)', async () => {
    const thinResponse = {
      retail: { priceCad: null, source: null, url: null },
      kijiji: {
        newSealed: { low: null, high: null, sampleSize: 0, examples: [] },
        used: { low: null, high: null, sampleSize: 0, examples: [] },
      },
      ebaySold: { priceCad: null, sampleSize: 0, thin: true, exchangeRateUsed: null, examples: [] },
      openBox: { priceCad: null, basis: null },
      bottomLine: {
        priceCad: 20,
        low: 15,
        high: 25,
        rationale: 'Best-effort estimate, thin data.',
      },
      dataQuality: { flags: ['No sources returned usable data'] },
    }
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(thinResponse) })

    const result = await researchPrice('fake-key', CANDIDATE)

    expect(result).toEqual(thinResponse)
  })
})

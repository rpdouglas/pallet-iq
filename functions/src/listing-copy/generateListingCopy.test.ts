import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ItemScanCandidate } from '../item-scans/types'
import type { PricingResult } from '../pricing/types'
import type { SaleabilityResult } from '../saleability/computeSaleability'

const mockGenerateContent = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent }
  },
}))

const { generateListingCopy } = await import('./generateListingCopy')

const CANDIDATE: ItemScanCandidate = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: '13x12x13 in',
  notableFeatures: 'Minor scuff on lid',
  condition: 'good',
  conditionJustification: 'Visible light scuffing on the lid, otherwise clean.',
  confidence: 0.92,
  barcodeNumber: '0123456789012',
  groundedRetailPrice: 99.95,
  groundedRetailSource: 'instantpot.com',
}

const PRICING: PricingResult = {
  msrp: 99.95,
  salePrice: 55,
  salePriceLow: 45,
  salePriceHigh: 65,
  liquidationPrice: 30,
  confidence: 0.7,
  sampleSize: 4,
  factors: [{ label: 'Condition: good', direction: 'neutral', explanation: null }],
  comps: [],
  waterfallStepsUsed: ['kijiji_used'],
}

const SALEABILITY: SaleabilityResult = {
  score: 0.72,
  factors: [{ label: 'Condition: good', direction: 'neutral', explanation: null }],
}

const RESPONSE = {
  title: 'Instant Pot Duo 6-Quart - Good Condition',
  description: 'A well-used Instant Pot Duo 6-Quart with light cosmetic wear on the lid.',
}

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('generateListingCopy', () => {
  it('parses a plain JSON object response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(RESPONSE) })

    const result = await generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)

    expect(result).toEqual(RESPONSE)
  })

  it('strips a markdown code fence around the JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n' + JSON.stringify(RESPONSE) + '\n```',
    })

    const result = await generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)

    expect(result).toEqual(RESPONSE)
  })

  it('sends a text-only prompt, no image data and no tools', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(RESPONSE) })

    await generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)

    const call = mockGenerateContent.mock.calls[0][0] as {
      contents: unknown[]
      config?: { tools?: unknown[] }
    }
    expect(call.contents).toHaveLength(1)
    expect(typeof call.contents[0]).toBe('string')
    expect(call.config?.tools).toBeUndefined()
  })

  it('includes the candidate, price, and saleability details in the prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(RESPONSE) })

    await generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)

    const prompt = mockGenerateContent.mock.calls[0][0] as { contents: [string] }
    expect(prompt.contents[0]).toContain('Instant Pot Duo 6-Quart')
    expect(prompt.contents[0]).toContain('$55.00 CAD')
    expect(prompt.contents[0]).toContain('Condition: good')
  })

  it('tells the model not to invent a price when salePrice is null', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(RESPONSE) })

    await generateListingCopy(
      'fake-key',
      CANDIDATE,
      { ...PRICING, salePrice: null, salePriceLow: null, salePriceHigh: null },
      SALEABILITY,
    )

    const prompt = mockGenerateContent.mock.calls[0][0] as { contents: [string] }
    expect(prompt.contents[0]).toContain('No recommended asking price is available')
  })

  it('throws when Gemini returns an empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: undefined })

    await expect(generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)).rejects.toThrow(
      /empty response/i,
    )
  })

  it('throws when the response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json at all' })

    await expect(generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)).rejects.toThrow()
  })

  it('throws when the response JSON does not match the expected schema', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ title: 'Only a title' }) })

    await expect(generateListingCopy('fake-key', CANDIDATE, PRICING, SALEABILITY)).rejects.toThrow(
      /schema/i,
    )
  })
})

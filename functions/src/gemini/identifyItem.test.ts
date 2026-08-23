import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockGenerateContent = vi.fn<(...args: unknown[]) => Promise<unknown>>()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent }
  },
}))

const { identifyItem, CONFIDENCE_THRESHOLD } = await import('./identifyItem')

const HIGH_CONFIDENCE_CANDIDATE = {
  itemName: 'Instant Pot Duo 6-Quart',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen Appliances',
  dimensions: '13x12x13 in',
  notableFeatures: 'Minor scuff on lid',
  condition: 'good',
  conditionJustification: 'Visible light scuffing on the lid, otherwise clean.',
  confidence: 0.92,
}

function photo(): { data: Buffer; mimeType: string } {
  return { data: Buffer.from('fake-image-bytes'), mimeType: 'image/jpeg' }
}

beforeEach(() => {
  mockGenerateContent.mockReset()
})

describe('identifyItem', () => {
  it('parses a plain JSON array response and auto-selects a high-confidence single candidate', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([HIGH_CONFIDENCE_CANDIDATE]),
    })

    const result = await identifyItem('fake-key', [photo()])

    expect(result.candidates).toEqual([HIGH_CONFIDENCE_CANDIDATE])
    expect(result.selectedCandidateIndex).toBe(0)
    expect(HIGH_CONFIDENCE_CANDIDATE.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD)
  })

  it('strips a markdown code fence around the JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n' + JSON.stringify([HIGH_CONFIDENCE_CANDIDATE]) + '\n```',
    })

    const result = await identifyItem('fake-key', [photo()])

    expect(result.candidates).toEqual([HIGH_CONFIDENCE_CANDIDATE])
  })

  it('leaves selectedCandidateIndex null and sorts by confidence when the top candidate is below threshold', async () => {
    const low = { ...HIGH_CONFIDENCE_CANDIDATE, itemName: 'Mystery Item A', confidence: 0.4 }
    const lower = { ...HIGH_CONFIDENCE_CANDIDATE, itemName: 'Mystery Item B', confidence: 0.3 }
    mockGenerateContent.mockResolvedValueOnce({
      // Sent out of order on purpose - identifyItem re-sorts by confidence.
      text: JSON.stringify([lower, low]),
    })

    const result = await identifyItem('fake-key', [photo()])

    expect(result.selectedCandidateIndex).toBeNull()
    expect(result.candidates.map((c) => c.itemName)).toEqual(['Mystery Item A', 'Mystery Item B'])
  })

  it('sends every photo as inline base64 data alongside the text prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([HIGH_CONFIDENCE_CANDIDATE]),
    })

    await identifyItem('fake-key', [photo(), photo()])

    const call = mockGenerateContent.mock.calls[0][0] as { contents: unknown[] }
    expect(call.contents).toHaveLength(3) // 1 text prompt + 2 photos
    expect(call.contents[1]).toEqual({
      inlineData: {
        data: Buffer.from('fake-image-bytes').toString('base64'),
        mimeType: 'image/jpeg',
      },
    })
  })

  it('enables Google Search grounding', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([HIGH_CONFIDENCE_CANDIDATE]),
    })

    await identifyItem('fake-key', [photo()])

    const call = mockGenerateContent.mock.calls[0][0] as { config: { tools: unknown[] } }
    expect(call.config.tools).toEqual([{ googleSearch: {} }])
  })

  it('throws when Gemini returns an empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: undefined })

    await expect(identifyItem('fake-key', [photo()])).rejects.toThrow(/empty response/i)
  })

  it('throws when the response is not valid JSON', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json at all' })

    await expect(identifyItem('fake-key', [photo()])).rejects.toThrow()
  })

  it('throws when the response JSON does not match the expected schema', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([{ itemName: 'Missing everything else' }]),
    })

    await expect(identifyItem('fake-key', [photo()])).rejects.toThrow(/schema/i)
  })

  it('throws when more than 3 candidates are returned', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify([
        HIGH_CONFIDENCE_CANDIDATE,
        HIGH_CONFIDENCE_CANDIDATE,
        HIGH_CONFIDENCE_CANDIDATE,
        HIGH_CONFIDENCE_CANDIDATE,
      ]),
    })

    await expect(identifyItem('fake-key', [photo()])).rejects.toThrow(/schema/i)
  })
})

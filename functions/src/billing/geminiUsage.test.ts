import { describe, expect, it, vi } from 'vitest'

const mockIncrementUsage = vi.fn<(...args: unknown[]) => Promise<void>>()
vi.mock('./incrementUsage', () => ({ incrementUsage: mockIncrementUsage }))

const mockLoggerWarn = vi.fn()
vi.mock('firebase-functions/v2', () => ({ logger: { warn: mockLoggerWarn } }))

const mockGet = vi.fn()
const mockDoc = vi.fn(() => ({ get: mockGet }))
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ doc: mockDoc }),
}))

const { geminiCallsUsageKey, recordGeminiCalls, checkGeminiCallCap } = await import('./geminiUsage')

function resetMocks() {
  mockIncrementUsage.mockReset()
  mockLoggerWarn.mockReset()
  mockGet.mockReset()
  mockDoc.mockClear()
}

describe('geminiCallsUsageKey', () => {
  it('formats a UTC year-month key, zero-padded', () => {
    expect(geminiCallsUsageKey(new Date('2026-01-05T00:00:00Z'))).toBe('geminiCalls_2026_01')
    expect(geminiCallsUsageKey(new Date('2026-11-30T23:59:59Z'))).toBe('geminiCalls_2026_11')
  })
})

describe('recordGeminiCalls', () => {
  it('does nothing when count is zero (a cache hit)', async () => {
    resetMocks()
    await recordGeminiCalls('tenant-a', 0)
    expect(mockIncrementUsage).not.toHaveBeenCalled()
  })

  it('does nothing when count is negative', async () => {
    resetMocks()
    await recordGeminiCalls('tenant-a', -1)
    expect(mockIncrementUsage).not.toHaveBeenCalled()
  })

  it('increments the month-keyed usage counter by the given count', async () => {
    resetMocks()
    mockIncrementUsage.mockResolvedValueOnce(undefined)

    await recordGeminiCalls('tenant-a', 4)

    expect(mockIncrementUsage).toHaveBeenCalledWith(
      'tenant-a',
      expect.stringMatching(/^geminiCalls_\d{4}_\d{2}$/),
      4,
    )
  })

  it('swallows a failed usage write rather than throwing - metering must never break the real feature', async () => {
    resetMocks()
    mockIncrementUsage.mockRejectedValueOnce(new Error('Firestore write failed'))

    await expect(recordGeminiCalls('tenant-a', 1)).resolves.toBeUndefined()
    expect(mockLoggerWarn).toHaveBeenCalled()
  })
})

describe('checkGeminiCallCap', () => {
  it('never throws for a pro-tier tenant, regardless of usage', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ plan: 'pro', usage: { [geminiCallsUsageKey()]: 100_000 } }),
    })

    await expect(checkGeminiCallCap('tenant-a')).resolves.toBeUndefined()
  })

  it('allows a free-tier tenant under the cap', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ plan: 'free', usage: { [geminiCallsUsageKey()]: 99 } }),
    })

    await expect(checkGeminiCallCap('tenant-a')).resolves.toBeUndefined()
  })

  it('rejects a free-tier tenant at or over the cap', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({
      data: () => ({ plan: 'free', usage: { [geminiCallsUsageKey()]: 100 } }),
    })

    await expect(checkGeminiCallCap('tenant-a')).rejects.toThrow(/monthly gemini usage limit/i)
  })

  it('treats a missing subscription doc as free tier with zero usage, not an error', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => undefined })

    await expect(checkGeminiCallCap('tenant-a')).resolves.toBeUndefined()
  })

  it('treats a month with no recorded usage yet as zero, not a crash', async () => {
    resetMocks()
    mockGet.mockResolvedValueOnce({ data: () => ({ plan: 'free', usage: {} }) })

    await expect(checkGeminiCallCap('tenant-a')).resolves.toBeUndefined()
  })
})

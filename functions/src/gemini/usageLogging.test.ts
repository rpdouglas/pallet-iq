import { describe, expect, it, vi } from 'vitest'

const mockLoggerInfo = vi.fn()
vi.mock('firebase-functions/v2', () => ({ logger: { info: mockLoggerInfo } }))

const { logGeminiCall } = await import('./usageLogging')

describe('logGeminiCall', () => {
  it('logs the call site, model, grounded flag, and usage token counts', () => {
    logGeminiCall({
      callSite: 'identifyItem',
      model: 'gemini-3.6-flash',
      grounded: true,
      response: {
        usageMetadata: {
          promptTokenCount: 500,
          candidatesTokenCount: 120,
          toolUsePromptTokenCount: 40,
          thoughtsTokenCount: 0,
          totalTokenCount: 660,
        },
      },
    } as never)

    expect(mockLoggerInfo).toHaveBeenCalledWith('gemini_call', {
      callSite: 'identifyItem',
      model: 'gemini-3.6-flash',
      grounded: true,
      promptTokenCount: 500,
      candidatesTokenCount: 120,
      toolUsePromptTokenCount: 40,
      thoughtsTokenCount: 0,
      totalTokenCount: 660,
    })
  })

  it('logs nulls when usageMetadata is missing entirely, rather than throwing', () => {
    logGeminiCall({
      callSite: 'generateListingCopy',
      model: 'gemini-3.6-flash',
      grounded: false,
      response: {},
    } as never)

    expect(mockLoggerInfo).toHaveBeenCalledWith('gemini_call', {
      callSite: 'generateListingCopy',
      model: 'gemini-3.6-flash',
      grounded: false,
      promptTokenCount: null,
      candidatesTokenCount: null,
      toolUsePromptTokenCount: null,
      thoughtsTokenCount: null,
      totalTokenCount: null,
    })
  })
})

import { describe, expect, it } from 'vitest'
import { getConditionBadgeTone } from './conditionBadgeTone'

describe('getConditionBadgeTone', () => {
  it('maps Returns to amber', () => {
    expect(getConditionBadgeTone('Returns')).toBe('amber')
  })

  it('maps Like New to emerald', () => {
    expect(getConditionBadgeTone('Like New')).toBe('emerald')
  })

  it('maps New to sky', () => {
    expect(getConditionBadgeTone('New')).toBe('sky')
  })

  it('falls back to slate for an unrecognized condition string', () => {
    // Real production data isn't limited to the 3 known values - condition
    // is raw server free text (e.g. "Brand New" seen in DiscoveredLotsPage
    // fixtures), so an unmapped value must degrade gracefully, not throw.
    expect(getConditionBadgeTone('Brand New')).toBe('slate')
    expect(getConditionBadgeTone('')).toBe('slate')
  })
})

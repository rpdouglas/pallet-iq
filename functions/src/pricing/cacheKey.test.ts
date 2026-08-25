import { describe, expect, it } from 'vitest'
import { computeCacheKey } from './cacheKey'

const BASE = {
  itemName: 'Instant Pot Duo',
  brand: 'Instant Pot',
  model: 'Duo60',
  category: 'Kitchen',
  dimensions: null,
  notableFeatures: null,
  condition: 'good' as const,
  conditionJustification: 'Fine.',
  confidence: 0.9,
  barcodeNumber: null,
  groundedRetailPrice: null,
  groundedRetailSource: null,
}

describe('computeCacheKey', () => {
  it('uses the barcode when present', () => {
    expect(computeCacheKey({ ...BASE, barcodeNumber: '012345678905' })).toBe('upc:012345678905')
  })

  it('falls back to a normalized brand|model|itemName fingerprint with no barcode', () => {
    expect(computeCacheKey(BASE)).toBe('fp:instant pot|duo60|instant pot duo')
  })

  it('produces the same fingerprint regardless of case', () => {
    const a = computeCacheKey(BASE)
    const b = computeCacheKey({ ...BASE, brand: 'INSTANT POT', model: 'duo60' })
    expect(a).toBe(b)
  })

  it('collapses internal multi-space runs to a single space', () => {
    expect(computeCacheKey({ ...BASE, itemName: 'Instant   Pot   Duo' })).toBe(
      'fp:instant pot|duo60|instant pot duo',
    )
  })

  it('omits missing fields from the fingerprint rather than leaving gaps', () => {
    expect(computeCacheKey({ ...BASE, brand: null, model: null })).toBe('fp:instant pot duo')
  })

  it('falls back to the fingerprint when barcodeNumber is a placeholder like "N/A"', () => {
    // "N/A" contains a literal "/" - passed through unsanitized, this
    // corrupts a Firestore document path built from it (found
    // live-verifying PALLETIQ-042 against real manifest data).
    expect(computeCacheKey({ ...BASE, barcodeNumber: 'N/A' })).toBe(
      'fp:instant pot|duo60|instant pot duo',
    )
  })

  it('strips non-digit noise from an otherwise-real barcode', () => {
    expect(computeCacheKey({ ...BASE, barcodeNumber: '012-345-678905' })).toBe('upc:012345678905')
  })

  it('falls back to the fingerprint when the digits-only barcode is too short to be real', () => {
    expect(computeCacheKey({ ...BASE, barcodeNumber: '123' })).toBe(
      'fp:instant pot|duo60|instant pot duo',
    )
  })
})

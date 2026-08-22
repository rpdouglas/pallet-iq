import { describe, expect, it } from 'vitest'
import { extractRowQuantity, normalizeRow } from './normalize'

describe('normalizeRow', () => {
  it('normalizes a well-formed row using exact header names', () => {
    const result = normalizeRow({
      sku: 'ABC-123',
      upc: '012345678905',
      description: 'Wireless Mouse',
      quantity: '10',
      unitCost: '4.50',
      condition: 'New',
      category: 'Electronics',
    })

    expect(result).toEqual({
      lineItem: {
        sku: 'ABC-123',
        upc: '012345678905',
        description: 'Wireless Mouse',
        quantity: 10,
        unitCost: 4.5,
        condition: 'New',
        category: 'Electronics',
      },
    })
  })

  it('matches common header aliases case-insensitively', () => {
    const result = normalizeRow({
      Item: 'Bluetooth Speaker',
      Qty: 5,
      'Unit Cost': '$12.99',
      Cat: 'Audio',
    })

    expect(result).toEqual({
      lineItem: {
        sku: null,
        upc: null,
        description: 'Bluetooth Speaker',
        quantity: 5,
        unitCost: 12.99,
        condition: null,
        category: 'Audio',
      },
    })
  })

  it('strips currency symbols and thousands separators from cost/quantity', () => {
    const result = normalizeRow({
      description: 'Pallet of mixed electronics',
      quantity: '1,200',
      price: '$1,234.56',
    })

    expect(result).toEqual({
      lineItem: {
        sku: null,
        upc: null,
        description: 'Pallet of mixed electronics',
        quantity: 1200,
        unitCost: 1234.56,
        condition: null,
        category: null,
      },
    })
  })

  it('errors on a missing description', () => {
    expect(normalizeRow({ quantity: 1, cost: 1 })).toEqual({ error: 'Missing description' })
  })

  it('errors on a missing or zero quantity', () => {
    expect(normalizeRow({ description: 'Widget', cost: 1 })).toEqual({
      error: 'Missing or invalid quantity',
    })
    expect(normalizeRow({ description: 'Widget', quantity: 0, cost: 1 })).toEqual({
      error: 'Missing or invalid quantity',
    })
  })

  it('errors on a missing or negative unit cost', () => {
    expect(normalizeRow({ description: 'Widget', quantity: 1 })).toEqual({
      error: 'Missing or invalid unit cost',
    })
    expect(normalizeRow({ description: 'Widget', quantity: 1, cost: -5 })).toEqual({
      error: 'Missing or invalid unit cost',
    })
  })

  it('allows a zero unit cost (free/promotional items)', () => {
    const result = normalizeRow({ description: 'Free sample', quantity: 1, cost: 0 })

    expect(result).toEqual({
      lineItem: {
        sku: null,
        upc: null,
        description: 'Free sample',
        quantity: 1,
        unitCost: 0,
        condition: null,
        category: null,
      },
    })
  })

  // PALLETIQ-022 / ADR-0010 - a real Restock.ca manifest's actual headers.
  // MSRP is retail reference value, not a cost alias - this row still
  // needs a flatUnitCost fallback (see below) to succeed at all.
  it('matches a Restock.ca-style manifest\'s "Title" and "Merchant SKU" headers', () => {
    const withoutFallback = normalizeRow({
      UPC: '841821054502',
      'Merchant SKU': '0084182105450',
      Quantity: '5',
      Title: 'Greenworks 9A 14" 2In1 Lawnmower Green/Black',
      MSRP: '$168.00',
    })
    expect(withoutFallback).toEqual({ error: 'Missing or invalid unit cost' })

    const withFallback = normalizeRow(
      {
        UPC: '841821054502',
        'Merchant SKU': '0084182105450',
        Quantity: '5',
        Title: 'Greenworks 9A 14" 2In1 Lawnmower Green/Black',
        MSRP: '$168.00',
      },
      25,
    )
    expect(withFallback).toEqual({
      lineItem: {
        sku: '0084182105450',
        upc: '841821054502',
        description: 'Greenworks 9A 14" 2In1 Lawnmower Green/Black',
        quantity: 5,
        unitCost: 25,
        condition: null,
        category: null,
      },
    })
  })

  describe('flatUnitCost fallback (PALLETIQ-022 / ADR-0010)', () => {
    it('uses flatUnitCost when the row has no direct cost column', () => {
      const result = normalizeRow({ description: 'Scooter', quantity: 1 }, 25)

      expect(result).toEqual({
        lineItem: {
          sku: null,
          upc: null,
          description: 'Scooter',
          quantity: 1,
          unitCost: 25,
          condition: null,
          category: null,
        },
      })
    })

    it('prefers a real manifest-stated cost over flatUnitCost', () => {
      const result = normalizeRow({ description: 'Mower', quantity: 1, cost: 40 }, 25)

      expect(result).toEqual({
        lineItem: {
          sku: null,
          upc: null,
          description: 'Mower',
          quantity: 1,
          unitCost: 40,
          condition: null,
          category: null,
        },
      })
    })

    it('still errors when both direct cost and flatUnitCost are unavailable', () => {
      expect(normalizeRow({ description: 'Widget', quantity: 1 }, null)).toEqual({
        error: 'Missing or invalid unit cost',
      })
    })

    // PALLETIQ-024. A manifest-stated cost that parses but is negative (a
    // vendor typo, e.g. "-4.50") is a real data error to surface, not a
    // missing value - it must not silently fall back to flatUnitCost, even
    // when one is available.
    it('errors on a negative direct cost rather than falling back to flatUnitCost', () => {
      expect(normalizeRow({ description: 'Widget', quantity: 1, cost: -5 }, 10)).toEqual({
        error: 'Missing or invalid unit cost',
      })
    })
  })

  describe('extractRowQuantity', () => {
    it('returns the quantity for a row with a valid description and quantity', () => {
      expect(extractRowQuantity({ description: 'Widget', quantity: '3' })).toBe(3)
    })

    it('returns null when description is missing, regardless of cost', () => {
      expect(extractRowQuantity({ quantity: 3, cost: 10 })).toBeNull()
    })

    it('returns null when quantity is missing or zero', () => {
      expect(extractRowQuantity({ description: 'Widget' })).toBeNull()
      expect(extractRowQuantity({ description: 'Widget', quantity: 0 })).toBeNull()
    })
  })
})

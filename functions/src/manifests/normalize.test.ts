import { describe, expect, it } from 'vitest'
import { normalizeRow } from './normalize'

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
})

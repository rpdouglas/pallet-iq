import type { LineItemDoc } from './types'

// Common header-name variants seen across vendor manifests. Matched
// case-insensitively, trimmed - "Unit Cost", "unitcost", "Cost" all resolve
// to the same field. This is the "extensible vendor importer pattern" from
// docs/projects/PROJ-PALLETIQ.md's design principles, kept as data (not a
// per-vendor code branch) since it's just column-name aliasing so far.
const FIELD_ALIASES = {
  sku: ['sku'],
  upc: ['upc', 'gtin'],
  description: ['description', 'desc', 'item', 'product', 'product description'],
  quantity: ['quantity', 'qty'],
  unitCost: ['unitcost', 'unit cost', 'cost', 'price', 'unit price'],
  condition: ['condition'],
  category: ['category', 'cat'],
} as const

function normalizeKey(key: string): string {
  return key.trim().toLowerCase()
}

function findField(row: Record<string, unknown>, aliases: readonly string[]): unknown {
  const normalizedRow = new Map(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value]),
  )
  for (const alias of aliases) {
    if (normalizedRow.has(alias)) {
      return normalizedRow.get(alias)
    }
  }
  return undefined
}

// Manifests often format numbers as "$12.50" or "1,234" - strip everything
// but digits/decimal/minus before parsing rather than rejecting the row.
function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string') {
    return null
  }
  const cleaned = value.replace(/[^0-9.-]/g, '')
  if (!cleaned) {
    return null
  }
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : null
}

function optionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return null
}

export type NormalizeResult = { lineItem: LineItemDoc } | { error: string }

// A row missing/failing to coerce a required field becomes an
// imports_errors doc instead of a lineItems doc - partial success, not
// all-or-nothing failure. See ADR-0006.
export function normalizeRow(rawRow: Record<string, unknown>): NormalizeResult {
  const description = optionalString(findField(rawRow, FIELD_ALIASES.description))
  if (!description) {
    return { error: 'Missing description' }
  }

  const quantity = coerceNumber(findField(rawRow, FIELD_ALIASES.quantity))
  if (quantity === null || quantity <= 0) {
    return { error: 'Missing or invalid quantity' }
  }

  const unitCost = coerceNumber(findField(rawRow, FIELD_ALIASES.unitCost))
  if (unitCost === null || unitCost < 0) {
    return { error: 'Missing or invalid unit cost' }
  }

  return {
    lineItem: {
      sku: optionalString(findField(rawRow, FIELD_ALIASES.sku)),
      upc: optionalString(findField(rawRow, FIELD_ALIASES.upc)),
      description,
      quantity,
      unitCost,
      condition: optionalString(findField(rawRow, FIELD_ALIASES.condition)),
      category: optionalString(findField(rawRow, FIELD_ALIASES.category)),
    },
  }
}

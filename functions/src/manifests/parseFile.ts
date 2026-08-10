import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import type { ManifestFormat } from './types'

// papaparse for CSV, exceljs for XLSX - see ADR-0006 for why (not xlsx/
// SheetJS, whose npm-published builds carry unpatched CVEs).
export async function parseFile(
  buffer: Buffer,
  format: ManifestFormat,
): Promise<Record<string, unknown>[]> {
  if (format === 'csv') {
    return parseCsv(buffer)
  }
  return parseXlsx(buffer)
}

// Cell values can be rich text, formula results, hyperlinks, etc. - only
// stringify the primitives we actually expect in a manifest cell, rather
// than risk a default Object toString producing "[object Object]".
function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return ''
}

function parseCsv(buffer: Buffer): Record<string, unknown>[] {
  const result = Papa.parse<Record<string, unknown>>(buffer.toString('utf-8'), {
    header: true,
    skipEmptyLines: true,
  })
  return result.data
}

async function parseXlsx(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook()
  // exceljs's own .d.ts declares a local `interface Buffer extends
  // ArrayBuffer {}` that shadows Node's real Buffer within that file,
  // so no real Buffer value can structurally satisfy it - a known exceljs
  // typing bug, not a real mismatch. `load()` genuinely accepts a Buffer.
  await workbook.xlsx.load(buffer as never)
  // Re-add the `| undefined` TS's default (non-noUncheckedIndexedAccess)
  // indexed-access typing drops - an XLSX file can genuinely have zero
  // worksheets at runtime regardless of what the type says.
  const worksheet = workbook.worksheets[0] as ExcelJS.Worksheet | undefined
  if (!worksheet) {
    return []
  }

  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cellToString(cell.value).trim()
  })

  const rows: Record<string, unknown>[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return
    }
    const rawRow: Record<string, unknown> = {}
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber]
      if (header) {
        rawRow[header] = cell.value
      }
    })
    if (
      Object.values(rawRow).some((value) => value !== null && value !== undefined && value !== '')
    ) {
      rows.push(rawRow)
    }
  })
  return rows
}

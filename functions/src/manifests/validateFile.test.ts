import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { validateFile } from './validateFile'

async function buildValidXlsxBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Manifest')
  sheet.addRow(['description', 'quantity', 'unitCost'])
  sheet.addRow(['Widget', 10, 4.5])
  return (await workbook.xlsx.writeBuffer()) as unknown as Buffer
}

async function buildMacroEnabledXlsxBuffer(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('xl/vbaProject.bin', Buffer.from('fake VBA project binary'))
  return zip.generateAsync({ type: 'nodebuffer' })
}

function expectRejected(result: Awaited<ReturnType<typeof validateFile>>, errorPattern: RegExp) {
  expect(result.valid).toBe(false)
  if (result.valid) {
    throw new Error('expected an invalid result')
  }
  expect(result.error).toMatch(errorPattern)
}

describe('validateFile', () => {
  it('accepts a real XLSX buffer', async () => {
    const buffer = await buildValidXlsxBuffer()

    await expect(validateFile(buffer, 'xlsx')).resolves.toEqual({ valid: true })
  })

  it('rejects a corrupt/non-ZIP buffer claiming to be XLSX', async () => {
    const buffer = Buffer.from('this is not a real spreadsheet file')

    expectRejected(await validateFile(buffer, 'xlsx'), /invalid xlsx/i)
  })

  it('rejects a macro-enabled workbook (real xl/vbaProject.bin entry)', async () => {
    const buffer = await buildMacroEnabledXlsxBuffer()

    expectRejected(await validateFile(buffer, 'xlsx'), /macro-enabled/i)
  })

  it('accepts a plain CSV buffer', async () => {
    const buffer = Buffer.from('description,quantity,unitCost\nWidget,10,4.50\n', 'utf-8')

    await expect(validateFile(buffer, 'csv')).resolves.toEqual({ valid: true })
  })

  it('rejects a CSV-claimed buffer that is actually a ZIP/XLSX file', async () => {
    const buffer = await buildValidXlsxBuffer()

    expectRejected(await validateFile(buffer, 'csv'), /invalid csv/i)
  })

  it('rejects a CSV-claimed buffer containing binary/NUL data', async () => {
    const buffer = Buffer.from([0x61, 0x62, 0x00, 0x63, 0x64])

    expectRejected(await validateFile(buffer, 'csv'), /invalid csv/i)
  })
})

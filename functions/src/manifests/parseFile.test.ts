import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { parseFile } from './parseFile'

describe('parseFile', () => {
  it('parses a CSV buffer into row objects keyed by header', async () => {
    const csv = 'description,quantity,unitCost\nWidget,10,4.50\nGadget,5,9.99\n'

    const rows = await parseFile(Buffer.from(csv, 'utf-8'), 'csv')

    expect(rows).toEqual([
      { description: 'Widget', quantity: '10', unitCost: '4.50' },
      { description: 'Gadget', quantity: '5', unitCost: '9.99' },
    ])
  })

  it('skips empty CSV lines', async () => {
    const csv = 'description,quantity\nWidget,10\n\n\nGadget,5\n'

    const rows = await parseFile(Buffer.from(csv, 'utf-8'), 'csv')

    expect(rows).toHaveLength(2)
  })

  it('parses an XLSX buffer into row objects keyed by the header row', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Manifest')
    sheet.addRow(['description', 'quantity', 'unitCost'])
    sheet.addRow(['Widget', 10, 4.5])
    sheet.addRow(['Gadget', 5, 9.99])
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer

    const rows = await parseFile(buffer, 'xlsx')

    expect(rows).toEqual([
      { description: 'Widget', quantity: 10, unitCost: 4.5 },
      { description: 'Gadget', quantity: 5, unitCost: 9.99 },
    ])
  })

  it('skips fully blank XLSX rows', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Manifest')
    sheet.addRow(['description', 'quantity'])
    sheet.addRow(['Widget', 10])
    sheet.addRow([])
    sheet.addRow(['Gadget', 5])
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer

    const rows = await parseFile(buffer, 'xlsx')

    expect(rows).toHaveLength(2)
  })

  it('returns an empty array for an XLSX workbook with no worksheets', async () => {
    const workbook = new ExcelJS.Workbook()
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer

    const rows = await parseFile(buffer, 'xlsx')

    expect(rows).toEqual([])
  })
})

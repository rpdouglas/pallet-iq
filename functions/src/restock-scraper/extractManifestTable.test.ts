import { describe, expect, it } from 'vitest'
import { extractManifestTable } from './extractManifestTable'

// PALLETIQ-052 / ADR-0018. This fixture shape is captured from real
// restock.ca lot detail pages (confirmed live across 4 categories), unlike
// fetchManifestLink.test.ts's synthetic fixtures - the <script
// type="text/template" id="manifest-template"> wrapper is the real markup.
function pageWith(templateInner: string): string {
  return `<html><body>
    <div class="manifest-container" id="manifest-container">
      <button id="load-manifest">Load Manifest</button>
    </div>
    <script type="text/template" id="manifest-template">${templateInner}</script>
  </body></html>`
}

describe('extractManifestTable', () => {
  it('extracts a single-row manifest table', () => {
    const html = pageWith(
      `<table><tbody><tr><th>UPC</th><th>Merchant SKU</th><th>QTY</th><th>TITLE</th><th>MSRP</th><th>Extended</th></tr><tr><td>035349672649</td><td>77721</td><td>5</td><td>Motiviate Stackg Chairs</td><td>$399.99</td><td>$1,999.95</td></tr></tbody></table>`,
    )
    expect(extractManifestTable(html)).toEqual([
      {
        UPC: '035349672649',
        'Merchant SKU': '77721',
        QTY: '5',
        TITLE: 'Motiviate Stackg Chairs',
        MSRP: '$399.99',
        Extended: '$1,999.95',
      },
    ])
  })

  it('extracts every row from a multi-row manifest table', () => {
    const html = pageWith(
      `<table><tbody>
        <tr><th>UPC</th><th>Merchant SKU</th><th>QTY</th><th>TITLE</th><th>MSRP</th><th>Extended</th></tr>
        <tr><td>690995988522</td><td>0069099598852</td><td>1</td><td>700C HYPER 36VOLT E-RIDE BLACK</td><td>$848.00</td><td>$848.00</td></tr>
        <tr><td>690995985538</td><td>0069099598553</td><td>1</td><td>27.5 VIKING ELITE COPPER</td><td>$448.00</td><td>$448.00</td></tr>
      </tbody></table>`,
    )
    const rows = extractManifestTable(html)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ UPC: '690995988522', QTY: '1' })
    expect(rows[1]).toMatchObject({ UPC: '690995985538', TITLE: '27.5 VIKING ELITE COPPER' })
  })

  it('returns an empty array when no manifest-template script exists', () => {
    expect(extractManifestTable('<html><body><p>No manifest here.</p></body></html>')).toEqual([])
  })

  it('returns an empty array when the template has no header row', () => {
    const html = pageWith('<table><tbody></tbody></table>')
    expect(extractManifestTable(html)).toEqual([])
  })

  it('returns an empty array when the template has a header but no data rows', () => {
    const html = pageWith('<table><tbody><tr><th>UPC</th><th>QTY</th></tr></tbody></table>')
    expect(extractManifestTable(html)).toEqual([])
  })
})

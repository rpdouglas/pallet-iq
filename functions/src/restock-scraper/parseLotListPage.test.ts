import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLotListPage } from './parseLotListPage'

// Real captured markup from restock.ca/all/ - see the fixture file's own
// header comment for provenance. PALLETIQ-020 / ADR-0009.
const fixtureHtml = readFileSync(join(__dirname, '__fixtures__', 'category-page.html'), 'utf-8')

describe('parseLotListPage', () => {
  it('parses all 7 real lot cards from the fixture', () => {
    const { lots, unparsedCount } = parseLotListPage(fixtureHtml)

    expect(unparsedCount).toBe(0)
    expect(lots).toHaveLength(7)
  })

  it('extracts every field correctly for a real "Returns" lot', () => {
    const { lots } = parseLotListPage(fixtureHtml)
    const lot = lots.find((l) => l.lotNumber === '1016710')

    expect(lot).toEqual({
      lotNumber: '1016710',
      title: '13 units of Home Furniture - MSRP $4,638 - Returns (Lot # 1016710)',
      category: 'Home Furniture',
      units: 13,
      condition: 'Returns',
      msrp: 4638,
      price: 834,
      costPerUnit: 64.15,
      vendor: 'Online Store - WFR',
      warehouse: 'Montreal (QC)',
      productUrl: 'https://www.restock.ca/1016710/',
      imageUrl:
        'https://cdn11.bigcommerce.com/s-ywapzaserd/images/stencil/500x659/products/76509/184609/1016710_3__73790.1786542670.jpg?c=2',
    })
  })

  it('extracts a real lot with a non-"Returns" condition (Salvage)', () => {
    const { lots } = parseLotListPage(fixtureHtml)
    const lot = lots.find((l) => l.lotNumber === '1019701')

    expect(lot).toMatchObject({
      lotNumber: '1019701',
      category: 'Used Office Phones',
      units: 69,
      condition: 'Salvage',
      msrp: 2070,
    })
  })

  it('reads the real total page count from the pagination block', () => {
    const { totalPages } = parseLotListPage(fixtureHtml)
    expect(totalPages).toBe(6)
  })

  it('defaults to 1 page when no pagination block is present', () => {
    const { totalPages } = parseLotListPage('<ul class="productGrid"></ul>')
    expect(totalPages).toBe(1)
  })

  it('counts and skips a card whose title does not match the expected format', () => {
    const html = `
      <ul class="productGrid">
        <li class="product">
          <article class="card">
            <h4 class="card-title"><a href="https://www.restock.ca/9999/">Some unexpected title</a></h4>
          </article>
        </li>
      </ul>
    `
    const { lots, unparsedCount } = parseLotListPage(html)
    expect(lots).toHaveLength(0)
    expect(unparsedCount).toBe(1)
  })

  it('handles a singular "1 unit of" title', () => {
    const html = `
      <ul class="productGrid">
        <li class="product">
          <article class="card">
            <h4 class="card-title"><a href="https://www.restock.ca/5555/">1 unit of Electronics - MSRP $100 - Brand New (Lot # 5555)</a></h4>
          </article>
        </li>
      </ul>
    `
    const { lots, unparsedCount } = parseLotListPage(html)
    expect(unparsedCount).toBe(0)
    expect(lots[0]).toMatchObject({ units: 1, condition: 'Brand New', lotNumber: '5555' })
  })

  // PALLETIQ-031. A real title captured live from restock.ca/all/?page=2
  // (not in the original fixture) - some lots use a warehouse-prefixed lot
  // number instead of a plain one, and the old pattern silently dropped
  // every one of them.
  it('handles a warehouse-prefixed lot number (e.g. "105-917312")', () => {
    const html = `
      <ul class="productGrid">
        <li class="product">
          <article class="card">
            <h4 class="card-title"><a href="https://www.restock.ca/105-917312/">1400 units of Pharmacy &amp; Wellness - MSRP $25,190 - Like New (Lot # 105-917312)</a></h4>
          </article>
        </li>
      </ul>
    `
    const { lots, unparsedCount } = parseLotListPage(html)
    expect(unparsedCount).toBe(0)
    expect(lots[0]).toMatchObject({
      units: 1400,
      category: 'Pharmacy & Wellness',
      condition: 'Like New',
      lotNumber: '105-917312',
    })
  })

  // PALLETIQ-040. Real category values captured live from restock.ca/all/
  // via PALLETIQ-039's live verification - restock.ca's own title
  // convention sometimes repeats the item's specific product name in the
  // category clause instead of a genuine category.
  function cardHtml(lotNumber: string, category: string) {
    return `
      <ul class="productGrid">
        <li class="product">
          <article class="card">
            <h4 class="card-title"><a href="https://www.restock.ca/${lotNumber}/">1 unit of ${category} - MSRP $100 - Brand New (Lot # ${lotNumber})</a></h4>
          </article>
        </li>
      </ul>
    `
  }

  it.each([
    ['14-inch Wheel Covers - Silver Finish - Part Number KT1061-14S/L'],
    ['Ionic Table Desks - 48 X 2'],
    ['Ionic 30"D x 29"H Square Tables - X-Base'],
    ['Hilroy 1.5" Mesh Front Pocket Zipper Binders'],
    ['Outdoor Large Shiplap TV Lift Cabinets for TVs - White'],
  ])('normalizes an item-specific category clause "%s" to "Uncategorized"', (category) => {
    const { lots } = parseLotListPage(cardHtml('9001', category))
    expect(lots[0].category).toBe('Uncategorized')
  })

  it.each([
    ['Automotive'],
    ['Midea Air Conditioners'],
    ['Motivate Stacking Chairs'],
    ['Clothing & Accessories'],
  ])('keeps a genuine category clause "%s" unchanged', (category) => {
    const { lots } = parseLotListPage(cardHtml('9002', category))
    expect(lots[0].category).toBe(category)
  })
})

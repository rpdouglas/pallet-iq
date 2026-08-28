import { describe, expect, it } from 'vitest'
import { parseLotListPage } from './parseLotListPage'

// SYNTHETIC markup, NOT real captured kwickstock.ca HTML - modeled on the
// visible text/layout from phone screenshots of
// https://kwickstock.ca/en/liquidation (this session had no network access
// to the domain to capture a real fixture, see parseLotListPage.ts's header
// comment). PALLETIQ-057. These tests exercise the parser's own extraction
// logic against a plausible card shape - they do NOT prove the parser works
// against the real site. Expect a follow-up fixing pass once someone can
// capture and paste real markup (or the first live Cloud Functions run
// surfaces a real lots-found/unparsedCount).
function cardHtml(overrides: {
  href?: string
  imgSrc?: string
  imgAlt?: string
  category?: string
  title?: string
  pricePerUnit?: string
  totalMeta?: string
  vendor?: string
  location?: string
  condition?: string
}): string {
  const {
    href = '/en/product/wholesale-pallet-clothing-brand-name',
    imgSrc = 'https://kwickstock.ca/images/clothing-pallet.jpg',
    imgAlt = 'Wholesale Pallet Clothing',
    category = 'Fashion &amp; Accessories',
    title = 'Wholesale Pallet Clothing — Brand Name...',
    pricePerUnit = '$5.20/unit',
    totalMeta = '$1,300 total • 250 items',
    vendor = 'KwickStock',
    location = 'Montréal',
    condition = '',
  } = overrides

  return `
    <a href="${href}" class="product-card">
      <div class="badges"><span>Available</span><span>Featured</span></div>
      <img src="${imgSrc}" alt="${imgAlt}" />
      <div class="card-body">
        <p class="category">${category}</p>
        <h3 class="title">${title}</h3>
        ${condition ? `<span class="pill">${condition}</span>` : ''}
        <div class="price">${pricePerUnit}</div>
        <div class="meta">${totalMeta}</div>
        <div class="seller"><span class="badge">${vendor}</span><span class="location">${location}</span></div>
      </div>
    </a>
  `
}

describe('parseLotListPage', () => {
  it('parses a single well-formed card', () => {
    const { lots, unparsedCount } = parseLotListPage(`<div class="grid">${cardHtml({})}</div>`)

    expect(unparsedCount).toBe(0)
    expect(lots).toHaveLength(1)
    expect(lots[0]).toEqual({
      lotId: 'wholesale-pallet-clothing-brand-name',
      title: 'Wholesale Pallet Clothing — Brand Name...',
      category: 'Fashion & Accessories',
      units: 250,
      condition: null,
      pricePerUnit: 5.2,
      totalPrice: 1300,
      vendor: 'KwickStock',
      location: 'Montréal',
      productUrl: 'https://kwickstock.ca/en/product/wholesale-pallet-clothing-brand-name',
      imageUrl: 'https://kwickstock.ca/images/clothing-pallet.jpg',
    })
  })

  it('parses multiple cards on one page without cross-contaminating fields', () => {
    const html = `<div class="grid">
      ${cardHtml({ href: '/en/product/lot-a', title: 'Lot A', pricePerUnit: '$1.00/unit', totalMeta: '$100 total • 100 items' })}
      ${cardHtml({ href: '/en/product/lot-b', title: 'Lot B', pricePerUnit: '$2.00/unit', totalMeta: '$200 total • 50 items' })}
    </div>`

    const { lots, unparsedCount } = parseLotListPage(html)

    expect(unparsedCount).toBe(0)
    expect(lots).toHaveLength(2)
    expect(lots.find((l) => l.lotId === 'lot-a')).toMatchObject({
      title: 'Lot A',
      pricePerUnit: 1,
      units: 100,
    })
    expect(lots.find((l) => l.lotId === 'lot-b')).toMatchObject({
      title: 'Lot B',
      pricePerUnit: 2,
      units: 50,
    })
  })

  it('picks up a condition pill matching a known Condition filter value', () => {
    const { lots } = parseLotListPage(`<div class="grid">${cardHtml({ condition: 'new' })}</div>`)
    expect(lots[0].condition).toBe('New')
  })

  it('resolves a relative image src and href against the site origin', () => {
    const { lots } = parseLotListPage(
      `<div class="grid">${cardHtml({ href: '/en/product/relative-lot', imgSrc: '/images/relative.jpg' })}</div>`,
    )
    expect(lots[0].productUrl).toBe('https://kwickstock.ca/en/product/relative-lot')
    expect(lots[0].imageUrl).toBe('https://kwickstock.ca/images/relative.jpg')
  })

  it('falls back to the image alt text when no heading is present', () => {
    const html = `
      <div class="grid">
        <a href="/en/product/no-heading-lot">
          <img src="https://kwickstock.ca/images/x.jpg" alt="Fallback Title From Alt" />
          <div>$3.00/unit</div>
        </a>
      </div>
    `
    const { lots, unparsedCount } = parseLotListPage(html)
    expect(unparsedCount).toBe(0)
    expect(lots[0].title).toBe('Fallback Title From Alt')
  })

  it('skips a would-be card with a price anchor but no href/image (counts as unparsed)', () => {
    const html = `
      <div class="grid">
        <div>
          <h3>Orphan Lot</h3>
          <div>$4.00/unit</div>
        </div>
      </div>
    `
    const { lots, unparsedCount } = parseLotListPage(html)
    expect(lots).toHaveLength(0)
    expect(unparsedCount).toBe(1)
  })

  it('ignores a card with no "$X/unit" price text at all (silent miss, not counted)', () => {
    const html = `
      <div class="grid">
        <a href="/en/product/sold-out-lot">
          <img src="https://kwickstock.ca/images/x.jpg" alt="Sold Out Lot" />
          <div>Sold out</div>
        </a>
      </div>
    `
    const { lots, unparsedCount } = parseLotListPage(html)
    expect(lots).toHaveLength(0)
    expect(unparsedCount).toBe(0)
  })

  it('returns an empty result for an empty page', () => {
    const { lots, unparsedCount } = parseLotListPage('<html><body></body></html>')
    expect(lots).toHaveLength(0)
    expect(unparsedCount).toBe(0)
  })
})

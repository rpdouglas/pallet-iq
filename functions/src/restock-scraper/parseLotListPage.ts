import * as cheerio from 'cheerio'
import type { ParsedLot } from './types'

export interface ParsedLotListPage {
  lots: ParsedLot[]
  totalPages: number
  // Count of cards that matched the .card selector but whose title didn't
  // match TITLE_PATTERN - surfaced so the caller can log a warning (a
  // string of these would mean restock.ca changed its title format and
  // this parser needs updating), without this pure function needing a
  // logger dependency itself.
  unparsedCount: number
}

// PALLETIQ-020 / ADR-0009. restock.ca (a BigCommerce Stencil storefront)
// packs each lot's headline data into one title string, e.g.:
//   "13 units of Home Furniture - MSRP $4,638 - Returns (Lot # 1016710)"
// Verified against a real captured page - see __fixtures__/category-page.html.
const TITLE_PATTERN =
  /^(\d+)\s+units?\s+of\s+(.+?)\s+-\s+MSRP\s+\$([\d,.]+)\s+-\s+([^(]+?)\s+\(Lot #\s*(\d+)\)\s*$/i

function parseMoney(text: string | undefined): number | null {
  if (!text) {
    return null
  }
  const cleaned = text.replace(/[^0-9.]/g, '')
  if (!cleaned) {
    return null
  }
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function parseLotListPage(html: string): ParsedLotListPage {
  const $ = cheerio.load(html)
  const lots: ParsedLot[] = []
  let unparsedCount = 0

  // The "Cost per Unit :" / "Vendor :" / "Warehouse :" fields all live in
  // sibling `div.custom6.test2` elements whose OTHER classes look like a
  // freelancer's temporary theme-hack scaffolding ("test-here6", "test2",
  // "tester2") - matched here by visible label text instead of depending
  // on those less-stable class names holding still. "Cost per Unit"/
  // "Vendor" wrap their value in a nested .custom-value1 span; "Warehouse"
  // doesn't - its value is plain trailing text after the label spans.
  // Partial<Record<...>>, not Record<...> - a card genuinely may not have
  // every labeled field (e.g. a future markup tweak drops "Warehouse"),
  // and this repo's tsconfig doesn't set noUncheckedIndexedAccess, so a
  // bare Record<string, string> would let TS/eslint treat every lookup as
  // definitely-present and flag the `?? null` fallbacks below as dead code.
  function extractLabeledFields(card: ReturnType<typeof $>): Partial<Record<string, string>> {
    const fields: Partial<Record<string, string>> = {}
    card.find('div.custom6.test2').each((_, fieldEl) => {
      const $field = $(fieldEl)
      const label = $field
        .find('.lang-en')
        .first()
        .text()
        .trim()
        .replace(/\s*:\s*$/, '')
      if (!label) {
        return
      }
      const valueSpan = $field.find('.custom-value1')
      if (valueSpan.length > 0) {
        fields[label] = valueSpan.first().text().trim()
      } else {
        const clone = $field.clone()
        clone.find('span').remove()
        fields[label] = clone.text().trim()
      }
    })
    return fields
  }

  $('ul.productGrid li.product article.card').each((_, cardEl) => {
    const $card = $(cardEl)
    const titleLink = $card.find('h4.card-title a').first()
    const titleText = titleLink.text().trim()
    const productUrl = titleLink.attr('href')?.trim()
    if (!productUrl) {
      unparsedCount += 1
      return
    }

    const match = TITLE_PATTERN.exec(titleText)
    if (!match) {
      unparsedCount += 1
      return
    }
    const [, unitsRaw, categoryRaw, msrpRaw, conditionRaw, lotNumber] = match

    const fields = extractLabeledFields($card)
    const priceSection = $card.find('.price-section.loopProducts').first()
    const msrpFromPriceSection = parseMoney(priceSection.find('.custom_priceFirst').first().text())
    const price = parseMoney(priceSection.find('.custom_priceSecond').first().text())

    const image = $card.find('img.card-image').first()
    const imageUrl = image.attr('data-src')?.trim() ?? image.attr('src')?.trim() ?? null

    lots.push({
      lotNumber,
      title: titleText,
      category: categoryRaw.trim(),
      units: Number(unitsRaw),
      condition: conditionRaw.trim(),
      msrp: msrpFromPriceSection ?? parseMoney(`$${msrpRaw}`),
      price,
      costPerUnit: parseMoney(fields['Cost per Unit']),
      vendor: fields.Vendor ?? null,
      warehouse: fields.Warehouse ?? null,
      productUrl,
      imageUrl,
    })
  })

  const totalPages = parseTotalPages($)
  return { lots, totalPages, unparsedCount }
}

function parseTotalPages($: ReturnType<typeof cheerio.load>): number {
  const label = $('.pagination-item--current .pagination-link').first().attr('aria-label')
  const match = label ? /of\s+(\d+)/i.exec(label) : null
  return match?.[1] ? Number(match[1]) : 1
}

import * as cheerio from 'cheerio'
import type { ParsedLot } from './types'

export interface ParsedLotListPage {
  lots: ParsedLot[]
  // Count of would-be cards this parser found a price-per-unit anchor for
  // but couldn't extract a productUrl/lotId/title from - surfaced so the
  // caller can log a warning, same posture as restock-scraper's
  // ParsedLotListPage. NOTE this can't count cards this parser never
  // anchored on at all (e.g. a sold-out card with no "$/unit" text) - see
  // this file's header comment.
  unparsedCount: number
}

const BASE_URL = 'https://kwickstock.ca'

// PALLETIQ-057 / ADR-0009 (Track A pattern reused for a second source).
//
// UNVERIFIED AGAINST A REAL PAGE. Unlike restock.ca's parser (PALLETIQ-020),
// which was built and tested against real captured markup (see
// restock-scraper/__fixtures__/category-page.html), this parser was written
// from phone screenshots of https://kwickstock.ca/en/liquidation only. This
// session's sandbox couldn't reach the domain at all (egress-blocked), and
// the user couldn't get view-source/DevTools working from mobile Chrome to
// paste real markup back. It deliberately does NOT guess CSS class names or
// DOM structure (no better than random against a real site) - instead it
// anchors on distinctive VISIBLE TEXT confirmed present in the screenshots
// ("$5.20/unit", "$1,300 total • 250 items"), which is far more likely to
// survive whatever the real markup turns out to be, then walks up the DOM
// to the nearest ancestor that also has a product link and an image.
//
// Treat this as a diagnostic-capable first pass, not a verified scraper.
// scrapeKwickstockLots.ts logs the lots-found/unparsedCount on every run
// specifically so the first real run's Cloud Functions logs give enough
// evidence for a fast, evidence-based follow-up fix - the same "ship, then
// fix from real production evidence" pattern PALLETIQ-031/032/040/044
// already used for restock.ca's own scraper. See PALLETIQ-057's
// docs/BACKLOG.md scope note for the full record, including the known gaps
// this can't cover yet (pagination/infinite-scroll, whether the page is
// server-rendered at all vs. JS-rendered - if it turns out to be the
// latter, this whole cheerio-based approach needs replacing with a headless
// browser, a real architectural change, not a parser tweak).
const PRICE_PER_UNIT_PATTERN = /\$\s*([\d,]+(?:\.\d+)?)\s*\/\s*unit/i
const TOTAL_ITEMS_PATTERN = /\$\s*([\d,]+(?:\.\d+)?)\s*total.*?([\d,]+)\s*items?/i
// The site's own Condition filter chips (screenshot 2), whitelisted rather
// than matched loosely - a card badge/pill reading e.g. "new" should map to
// one of these, not swallow unrelated short text as "condition".
const KNOWN_CONDITIONS = ['New', 'Like new', 'Used', 'Salvage']
const VENDOR_MARKER = 'KwickStock'

function parseMoney(text: string): number | null {
  const cleaned = text.replace(/,/g, '')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function resolveUrl(href: string): string | null {
  try {
    return new URL(href, BASE_URL).toString()
  } catch {
    return null
  }
}

// kwickstock.ca has no visible "Lot #" identifier on a listing card, unlike
// restock.ca - the product detail URL's own slug is the only stable
// per-listing identifier visible from the listing page. Firestore doc IDs
// can't contain "/", so this takes the last non-empty path segment.
function deriveLotId(productUrl: string): string | null {
  try {
    const segments = new URL(productUrl).pathname.split('/').filter(Boolean)
    return segments.length > 0 ? (segments[segments.length - 1] ?? null) : null
  } catch {
    return null
  }
}

export function parseLotListPage(html: string): ParsedLotListPage {
  const $ = cheerio.load(html)
  const lots: ParsedLot[] = []
  let unparsedCount = 0
  const seenCardRoots: ReturnType<typeof $>[] = []

  // Isolates an element's own direct text, excluding descendant elements -
  // same technique restock-scraper's extractLabeledFields uses to avoid a
  // parent-vs-child text match on the same anchor pattern.
  function ownText(el: ReturnType<typeof $>): string {
    return el.clone().children().remove().end().text().trim()
  }

  $('*').each((_, el) => {
    const $el = $(el)
    if (!PRICE_PER_UNIT_PATTERN.test(ownText($el))) {
      return
    }

    const ancestors = $el.parents().toArray()
    let cardRoot: ReturnType<typeof $> | null = null
    for (const ancestor of ancestors) {
      const $ancestor = $(ancestor)
      // The card's own link wrapper may BE the anchor (a whole-card <a>),
      // not merely contain one - .find() only matches descendants, so an
      // ancestor that is itself the <a href> needs its own check, or the
      // walk overshoots past the real card root to a shared grid/list
      // container that also happens to contain other cards' links/images.
      const hasLink = $ancestor.is('a[href]') || $ancestor.find('a[href]').length > 0
      if (hasLink && $ancestor.find('img').length > 0) {
        cardRoot = $ancestor
        break
      }
    }
    if (!cardRoot) {
      // Found a price-per-unit anchor but no ancestor with both a link and
      // an image - a genuine "couldn't extract a usable card" case.
      unparsedCount += 1
      return
    }
    const cardRootNode = cardRoot.get(0)
    if (seenCardRoots.some((root) => root.get(0) === cardRootNode)) {
      return
    }
    seenCardRoots.push(cardRoot)

    // cardRoot may itself be the <a href> (see the walk-up above) - .find()
    // wouldn't see that, so check self first.
    const link = cardRoot.is('a[href]') ? cardRoot : cardRoot.find('a[href]').first()
    const productUrl = resolveUrl(link.attr('href') ?? '')
    const lotId = productUrl ? deriveLotId(productUrl) : null
    if (!productUrl || !lotId) {
      unparsedCount += 1
      return
    }

    const image = cardRoot.find('img').first()
    const imageUrl = resolveUrl(image.attr('data-src')?.trim() ?? image.attr('src')?.trim() ?? '')

    let title = cardRoot.find('h1,h2,h3,h4,h5,h6').first().text().trim()
    if (!title) {
      title = image.attr('alt')?.trim() ?? ''
    }
    if (!title) {
      title = link.text().trim()
    }
    if (!title) {
      unparsedCount += 1
      return
    }

    const priceMatch = PRICE_PER_UNIT_PATTERN.exec(ownText($el))
    const pricePerUnit = priceMatch?.[1] ? parseMoney(priceMatch[1]) : null

    const cardText = cardRoot.text()
    const totalMatch = TOTAL_ITEMS_PATTERN.exec(cardText)
    const totalPrice = totalMatch?.[1] ? parseMoney(totalMatch[1]) : null
    const units = totalMatch?.[2] ? parseMoney(totalMatch[2]) : null

    const condition =
      KNOWN_CONDITIONS.find((c) => new RegExp(`(^|\\s)${c}(\\s|$)`, 'i').test(cardText)) ?? null

    const vendor = cardText.includes(VENDOR_MARKER) ? VENDOR_MARKER : null

    // Best-effort, genuinely fuzzy - unverified, expect this to need
    // real-markup fixing. Short (<40 char) non-empty text leaves under
    // cardRoot, in document order, filtered to exclude anything already
    // captured by a more specific pattern above (price, total/items,
    // condition, vendor) or equal to the title - this also excludes
    // unrelated badge text ("Available", "Featured") only insofar as
    // category is taken relative to the title heading, not just "first
    // leaf on the card" (badges/status pills often render before the
    // category label in DOM order, per the screenshots). On the theory a
    // category label sits immediately before the title (screenshot 2's
    // "FASHION & ACCESSORIES" line, directly above the title) and a
    // location sits immediately after the vendor badge (screenshot 2's
    // "KwickStock  Montréal" line): category is the closest remaining leaf
    // BEFORE the title heading, location is the first remaining leaf found
    // AFTER the one containing the vendor marker (title-heading position
    // doesn't matter for that one).
    const headingNode = cardRoot.find('h1,h2,h3,h4,h5,h6').first().get(0) ?? null
    const candidateLeaves: string[] = []
    let vendorLeafIndex = -1
    let category: string | null = null
    let passedHeading = false
    cardRoot.find('*').each((__, candidate) => {
      if (headingNode && candidate === headingNode) {
        passedHeading = true
        return
      }
      const text = ownText($(candidate))
      if (
        !text ||
        text.length > 40 ||
        text === title ||
        PRICE_PER_UNIT_PATTERN.test(text) ||
        /total/i.test(text) ||
        KNOWN_CONDITIONS.some((c) => c.toLowerCase() === text.toLowerCase())
      ) {
        return
      }
      if (!passedHeading) {
        category = text
      }
      if (text.includes(VENDOR_MARKER)) {
        vendorLeafIndex = candidateLeaves.length
      }
      candidateLeaves.push(text)
    })
    const location = vendorLeafIndex >= 0 ? (candidateLeaves[vendorLeafIndex + 1] ?? null) : null

    lots.push({
      lotId,
      title,
      category,
      units,
      condition,
      pricePerUnit,
      totalPrice,
      vendor,
      location,
      productUrl,
      imageUrl,
    })
  })

  return { lots, unparsedCount }
}

import * as cheerio from 'cheerio'

// PALLETIQ-020 / ADR-0009. Best-effort extraction of a publicly-exposed
// manifest link from a restock.ca lot DETAIL page (e.g.
// https://www.restock.ca/{lotNumber}/) - not the category listing page
// parseLotListPage.ts handles.
//
// UNLIKE parseLotListPage.ts, this was written and tested against a
// synthetic fixture, not a real captured detail page - no sample was
// available when this was written (only a category-listing-page snapshot
// was provided). Verify/adjust the selectors below against a real
// restock.ca lot detail page before relying on this in production. It
// fails soft by design (returns null on no match or a fetch error), so a
// wrong selector here degrades to "no manifest link captured," not a
// broken scrape - scrapeRestockLots.ts's core lot data is unaffected
// either way.
// PALLETIQ-044. Word-boundary, not a raw substring match - restock.ca has
// a real site-wide nav link to /furniture/unmanifested-furniture/, whose
// slug contains "manifest" as a substring ("un-manifest-ed"). A bare
// .includes('manifest') matches it on every single lot detail page,
// which is exactly what happened in production: all ~500 active lots
// ended up with this one wrong URL as their manifestUrl. `\b` correctly
// excludes "unmanifested" (no boundary between "n" and "m") while still
// matching real links, singular or plural ("-manifest.pdf", "manifests/").
const MANIFEST_WORD = /\bmanifests?\b/

export function extractManifestLink(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html)

  const candidate = $('a')
    .filter((_, el) => {
      const $el = $(el)
      const text = $el.text().trim().toLowerCase()
      const href = ($el.attr('href') ?? '').toLowerCase()
      return MANIFEST_WORD.test(text) || MANIFEST_WORD.test(href) || /\.pdf(\?|$)/.test(href)
    })
    .first()

  const href = candidate.attr('href')
  if (!href) {
    return null
  }

  try {
    return new URL(href, pageUrl).toString()
  } catch {
    return null
  }
}

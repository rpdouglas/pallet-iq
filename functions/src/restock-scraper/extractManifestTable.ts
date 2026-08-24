import * as cheerio from 'cheerio'

// PALLETIQ-052 / ADR-0018. Replaces fetchManifestLink.ts. restock.ca has no
// downloadable manifest file - confirmed live across multiple categories -
// the manifest is an HTML table already embedded in the lot detail page,
// inside <script type="text/template" id="manifest-template">, revealed
// client-side by a "Load manifest" button. The table is inert <script> text
// content, not part of the live DOM, so it needs its own cheerio.load() pass
// once extracted - a plain `$('table')` selector against the outer document
// would never see it.
//
// Header names are read from the page's own <th> cells, not hardcoded -
// robust to minor label variation. Fails soft (empty array), same posture
// as the function this replaces, for a page with no manifest table or an
// empty one - core lot data from the listing page is unaffected either way.
export function extractManifestTable(html: string): Record<string, string>[] {
  const $ = cheerio.load(html)
  const templateHtml = $('script#manifest-template').html()
  if (!templateHtml) {
    return []
  }

  const $table = cheerio.load(templateHtml)
  const headers: string[] = []
  $table('table tr')
    .first()
    .find('th')
    .each((_, el) => {
      headers.push($table(el).text().trim())
    })
  if (headers.length === 0) {
    return []
  }

  const rows: Record<string, string>[] = []
  $table('table tr')
    .slice(1)
    .each((_, tr) => {
      const cells = $table(tr).find('td')
      if (cells.length === 0) {
        return
      }
      const row: Record<string, string> = {}
      cells.each((i, td) => {
        const header = headers[i]
        if (header) {
          row[header] = $table(td).text().trim()
        }
      })
      rows.push(row)
    })
  return rows
}

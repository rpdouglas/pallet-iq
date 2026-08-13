import { logger } from 'firebase-functions/v2'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { extractManifestLink } from './fetchManifestLink'
import { parseLotListPage } from './parseLotListPage'
import type { ParsedLot, RestockLotDoc } from './types'

const BASE_URL = 'https://www.restock.ca'
const CATEGORY_PATH = '/all/'
// Circuit breaker, not the expected count - the real catalog was 6 pages
// (~52 lots/page) as of the ADR-0009 pre-flight check. Guards against an
// infinite loop if a future restock.ca markup change breaks
// parseLotListPage's totalPages parsing, not a limit meant to be hit.
const MAX_PAGES = 25
// Firestore batched writes cap at 500 ops - leave headroom, same margin
// processManifestImport.ts uses.
const BATCH_SIZE = 400
const USER_AGENT = 'PalletIQ-RestockScraper/1.0 (+https://mrt-pallet-iq.web.app; PALLETIQ-020)'

async function fetchAllLots(): Promise<{ lots: ParsedLot[]; pagesFetched: number }> {
  const lots: ParsedLot[] = []
  let pagesFetched = 0

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${BASE_URL}${CATEGORY_PATH}?page=${page.toString()}&sort=newest`
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) {
      logger.error(`scrapeRestockLots: ${url} returned ${response.status.toString()}`)
      break
    }

    const parsed = parseLotListPage(await response.text())
    if (parsed.unparsedCount > 0) {
      logger.warn(
        `scrapeRestockLots: ${parsed.unparsedCount.toString()} card(s) on page ` +
          `${page.toString()} didn't match the expected title format - skipped`,
      )
    }
    lots.push(...parsed.lots)
    pagesFetched = page

    if (page >= parsed.totalPages) {
      break
    }
  }

  return { lots, pagesFetched }
}

// Sequential, not parallel - only runs for genuinely new lots (a handful
// per hourly run in steady state), and staying polite to restock.ca's
// servers matters more here than shaving a few seconds off the run.
async function fetchManifestUrl(productUrl: string): Promise<string | null> {
  try {
    const response = await fetch(productUrl, { headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) {
      return null
    }
    return extractManifestLink(await response.text(), productUrl)
  } catch (err) {
    logger.warn(`scrapeRestockLots: manifest link fetch failed for ${productUrl}`, err)
    return null
  }
}

// PALLETIQ-020 / ADR-0009. restock.ca's own Terms of Use/robots.txt were
// checked before this was written and confirmed to permit scraping its
// public, fixed-price category pages - see ADR-0009's Context section for
// the full pre-flight record. This scraper covers restock.ca ONLY. B-Stock
// and Direct Liquidation are never scraped anywhere in this codebase - both
// explicitly prohibit it in their own Terms of Use; PALLETIQ-021's
// manual-entry-only watchlist covers those two sources instead.
//
// restock_lots is a global, cross-tenant collection (see types.ts/
// firestore.rules) - this is the only writer, via the Admin SDK.
// timeoutSeconds is pinned explicitly (not left on the 60s v2 default)
// since a first-ever run treats the entire catalog as new and fetches one
// manifest-link page per lot sequentially - same "intentional, documented
// resource-sandbox boundary" reasoning PALLETIQ-012/ADR-0008 used pinning
// processManifestImport's memory/timeoutSeconds.
export const scrapeRestockLots = onSchedule(
  { schedule: 'every 1 hours', timeoutSeconds: 540, memory: '256MiB' },
  async () => {
    const db = getFirestore()
    const collection = db.collection('restock_lots')

    const [{ lots, pagesFetched }, existingSnapshot] = await Promise.all([
      fetchAllLots(),
      collection.get(),
    ])

    const existingByLotNumber = new Map(existingSnapshot.docs.map((doc) => [doc.id, doc]))
    const seenLotNumbers = new Set<string>()

    let batch = db.batch()
    let opsInBatch = 0
    const flushIfNeeded = async () => {
      if (opsInBatch >= BATCH_SIZE) {
        await batch.commit()
        batch = db.batch()
        opsInBatch = 0
      }
    }

    let createdCount = 0
    let updatedCount = 0

    for (const lot of lots) {
      seenLotNumbers.add(lot.lotNumber)
      const existingDoc = existingByLotNumber.get(lot.lotNumber)
      const ref = collection.doc(lot.lotNumber)

      if (!existingDoc) {
        const manifestUrl = await fetchManifestUrl(lot.productUrl)
        batch.set(ref, {
          ...lot,
          manifestUrl,
          status: 'active',
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies RestockLotDoc)
        createdCount += 1
      } else {
        batch.update(ref, {
          ...lot,
          status: 'active',
          lastSeenAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies Partial<RestockLotDoc>)
        updatedCount += 1
      }
      opsInBatch += 1
      await flushIfNeeded()
    }

    // Lots that were active before this run but didn't appear in it have
    // sold out or been delisted since the last scrape.
    let closedCount = 0
    for (const doc of existingSnapshot.docs) {
      const data = doc.data() as RestockLotDoc
      if (!seenLotNumbers.has(doc.id) && data.status === 'active') {
        batch.update(doc.ref, {
          status: 'closed',
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies Partial<RestockLotDoc>)
        closedCount += 1
        opsInBatch += 1
        await flushIfNeeded()
      }
    }

    if (opsInBatch > 0) {
      await batch.commit()
    }

    logger.info(
      `scrapeRestockLots: fetched ${pagesFetched.toString()} page(s), ` +
        `${createdCount.toString()} new, ${updatedCount.toString()} updated, ` +
        `${closedCount.toString()} closed`,
    )
  },
)

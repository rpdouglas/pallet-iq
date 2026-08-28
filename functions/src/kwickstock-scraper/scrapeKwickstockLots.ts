import { logger } from 'firebase-functions/v2'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { parseLotListPage } from './parseLotListPage'
import type { KwickstockLotDoc } from './types'

const LISTING_URL = 'https://kwickstock.ca/en/liquidation'
// Firestore batched writes cap at 500 ops - leave headroom, same margin
// scrapeRestockLots.ts uses.
const BATCH_SIZE = 400
const USER_AGENT = 'PalletIQ-KwickstockScraper/1.0 (+https://mrt-pallet-iq.web.app; PALLETIQ-057)'

// PALLETIQ-057 / ADR-0009 (Track A pattern reused for a second source,
// after restock.ca's PALLETIQ-020). Owner-confirmed kwickstock.ca's Terms
// of Use permit scraping its public listings. This session couldn't
// independently verify kwickstock.ca's robots.txt - the domain is outside
// this remote environment's network egress allowlist - so implementation
// still owes a real robots.txt check before/soon after this first deploys;
// see PALLETIQ-057's docs/BACKLOG.md scope note for the full record, same
// "stop and surface if a prohibition exists" standard ADR-0009 set.
//
// UNVERIFIED AGAINST A REAL PAGE: parseLotListPage.ts was written from
// phone screenshots, not real captured markup - see that file's header
// comment for why and what it does instead of guessing DOM structure. The
// logged lots-found/unparsedCount below on the very first real run is the
// actual verification step, not this code. Expect a fast follow-up fix
// ticket once real output is visible - same "ship, then fix from real
// production evidence" pattern restock.ca's own scraper needed
// (PALLETIQ-031/032/040/044).
//
// Single-page fetch only for v1 - kwickstock.ca's pagination/infinite-scroll
// mechanism is unknown (no pagination control was visible in the
// screenshots this was built from). If the real catalog has more lots than
// one page surfaces, createdCount/updatedCount will visibly undercount on
// the first real run - that's the signal to scope a follow-up for
// multi-page fetching, not something to guess at here.
//
// kwickstock_lots is a global, cross-tenant collection (see types.ts/
// firestore.rules) - this is the only writer, via the Admin SDK.
export const scrapeKwickstockLots = onSchedule(
  { schedule: 'every 1 hours', timeoutSeconds: 120, memory: '256MiB' },
  async () => {
    const db = getFirestore()
    const collection = db.collection('kwickstock_lots')

    const response = await fetch(LISTING_URL, { headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) {
      logger.error(`scrapeKwickstockLots: ${LISTING_URL} returned ${response.status.toString()}`)
      return
    }

    const { lots, unparsedCount } = parseLotListPage(await response.text())
    if (unparsedCount > 0) {
      logger.warn(
        `scrapeKwickstockLots: ${unparsedCount.toString()} would-be card(s) had a price ` +
          `anchor but no usable href/title - selector heuristics likely need updating`,
      )
    }
    if (lots.length === 0) {
      logger.warn(
        'scrapeKwickstockLots: 0 lots parsed - either the catalog is genuinely empty, the ' +
          'page is JS-rendered (this scraper only reads server-rendered HTML), or the ' +
          'heuristics in parseLotListPage.ts need real-markup verification',
      )
    }

    const existingSnapshot = await collection.get()
    const existingByLotId = new Map(existingSnapshot.docs.map((doc) => [doc.id, doc]))
    const seenLotIds = new Set<string>()

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
      seenLotIds.add(lot.lotId)
      const existingDoc = existingByLotId.get(lot.lotId)
      const ref = collection.doc(lot.lotId)

      if (!existingDoc) {
        batch.set(ref, {
          ...lot,
          status: 'active',
          firstSeenAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies KwickstockLotDoc)
        createdCount += 1
      } else {
        batch.update(ref, {
          ...lot,
          status: 'active',
          lastSeenAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies Partial<KwickstockLotDoc>)
        updatedCount += 1
      }
      opsInBatch += 1
      await flushIfNeeded()
    }

    // Lots that were active before this run but didn't appear in it have
    // sold out or been delisted since the last scrape.
    let closedCount = 0
    for (const doc of existingSnapshot.docs) {
      const data = doc.data() as KwickstockLotDoc
      if (!seenLotIds.has(doc.id) && data.status === 'active') {
        batch.update(doc.ref, {
          status: 'closed',
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies Partial<KwickstockLotDoc>)
        closedCount += 1
        opsInBatch += 1
        await flushIfNeeded()
      }
    }

    if (opsInBatch > 0) {
      await batch.commit()
    }

    logger.info(
      `scrapeKwickstockLots: ${lots.length.toString()} lot(s) parsed, ` +
        `${createdCount.toString()} new, ${updatedCount.toString()} updated, ` +
        `${closedCount.toString()} closed`,
    )
  },
)

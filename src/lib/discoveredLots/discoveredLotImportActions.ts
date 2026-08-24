import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '../firebase'
import { listImports } from '../manifests/manifestActions'
import type { ImportSummary } from '../../types/manifest'

const functions = getFunctions(app)

export async function enqueueDiscoveredLotImport(lotId: string): Promise<{ importId: string }> {
  const call = httpsCallable<{ lotId: string }, { importId: string }>(
    functions,
    'enqueueDiscoveredLotImport',
  )
  return (await call({ lotId })).data
}

// Maps a restock_lots doc ID -> its most recent import for this tenant, if
// any. sourceRestockLotId is only ever set on imports created via the
// "Import" button (PALLETIQ-041) - a regular manual manifest upload leaves
// it null, so this only ever surfaces discovered-lot-originated imports.
// Reuses listImports (already ordered newest-first) rather than a new
// Firestore query shape - import counts per tenant are small, same
// "fetch the whole small collection, filter client-side" choice
// restockLotsActions.ts/WatchlistPage.tsx already made.
export async function listDiscoveredLotImports(
  tenantId: string,
): Promise<Map<string, ImportSummary>> {
  const imports = await listImports(tenantId)
  const map = new Map<string, ImportSummary>()
  for (const item of imports) {
    if (item.sourceRestockLotId && !map.has(item.sourceRestockLotId)) {
      map.set(item.sourceRestockLotId, item)
    }
  }
  return map
}

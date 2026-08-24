import type { ImportSummary } from '../../types/manifest'

// Same palette InventoryPage.tsx uses for its own status coloring. Shared
// between DiscoveredLotsPage.tsx's table and LotCard.tsx's card (PALLETIQ-050)
// so the two renderings of the same import status can't drift apart.
export const IMPORT_STATUS_STYLES: Record<ImportSummary['status'], string> = {
  queued: 'text-slate-gray',
  processing: 'text-brand-blue',
  completed: 'text-success',
  failed: 'text-danger',
}

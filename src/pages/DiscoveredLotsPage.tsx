import { useMemo, useState } from 'react'
import { ExternalLink, PackageSearch, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { LotCard } from '../components/LotCard'
import { Spinner } from '../components/Spinner'
import { SelectField } from '../components/form/SelectField'
import { useAuth } from '../lib/auth/useAuth'
import { dismissLot, listDismissedLotIds } from '../lib/discoveredLots/dismissedLotsActions'
import {
  enqueueDiscoveredLotImport,
  listDiscoveredLotImports,
} from '../lib/discoveredLots/discoveredLotImportActions'
import { IMPORT_STATUS_STYLES } from '../lib/discoveredLots/importStatusStyles'
import { formatMoney } from '../lib/format'
import { listActiveRestockLots } from '../lib/restockLots/restockLotsActions'
import type { ImportSummary } from '../types/manifest'
import type { RestockLot } from '../types/restockLot'

const ALL_CATEGORIES = 'All categories'

// Stable across renders, unlike `new Set()` inlined at use - avoids
// re-triggering visibleLots' useMemo on every render while dismissedQuery
// is still loading.
const EMPTY_DISMISSED_IDS = new Set<string>()

// Newest-discovered first, not "closes soon" - restock.ca lots are
// fixed-price, not auctions, so they have no closing time (that concept is
// specific to WatchlistPage.tsx's auction sources). Matches this ticket's
// own scope note.
function byDiscoveredNewest(a: RestockLot, b: RestockLot): number {
  return b.firstSeenAt.toMillis() - a.firstSeenAt.toMillis()
}

export function DiscoveredLotsPage() {
  const { tenantId, role } = useAuth()
  const queryClient = useQueryClient()
  const [category, setCategory] = useState(ALL_CATEGORIES)

  // PALLETIQ-041/043 - importing/dismissing a discovered lot is Buyer's
  // core sourcing job, same isOwnerOrBuyer posture as watchlist_lots/
  // imports (ADR-0006/ADR-0009). Read-only browsing (the pre-existing
  // PALLETIQ-039 scope) stays open to every tenant member.
  const canWrite = role === 'owner' || role === 'buyer'

  const lotsQuery = useQuery({
    queryKey: ['restockLots'],
    queryFn: listActiveRestockLots,
  })

  const dismissedQuery = useQuery({
    queryKey: ['dismissedLots', tenantId],
    queryFn: () => listDismissedLotIds(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const importsQuery = useQuery({
    queryKey: ['discoveredLotImports', tenantId],
    queryFn: () => listDiscoveredLotImports(tenantId ?? ''),
    enabled: !!tenantId && canWrite,
    // Import status transitions asynchronously (queued -> processing ->
    // completed/failed) server-side - poll while any tracked import is
    // still moving, same posture ManifestsPage.tsx/ScannedItemsPage.tsx
    // already use.
    refetchInterval: (query) =>
      Array.from(query.state.data?.values() ?? []).some(
        (item) => item.status === 'queued' || item.status === 'processing',
      )
        ? 2000
        : false,
  })

  const invalidateLotState = () => {
    void queryClient.invalidateQueries({ queryKey: ['dismissedLots', tenantId] })
    void queryClient.invalidateQueries({ queryKey: ['discoveredLotImports', tenantId] })
  }

  const importMutation = useMutation({
    mutationFn: (lotId: string) => enqueueDiscoveredLotImport(lotId),
    onSuccess: invalidateLotState,
  })

  const dismissMutation = useMutation({
    mutationFn: (lotId: string) => dismissLot(tenantId ?? '', lotId),
    onSuccess: invalidateLotState,
  })

  const onDismiss = (lot: RestockLot) => {
    if (window.confirm(`Remove "${lot.title}" from Discovered lots?`)) {
      dismissMutation.mutate(lot.id)
    }
  }

  const lots = useMemo(() => lotsQuery.data ?? [], [lotsQuery.data])
  const dismissedIds = dismissedQuery.data ?? EMPTY_DISMISSED_IDS
  const imports = importsQuery.data ?? new Map<string, ImportSummary>()

  const categories = useMemo(() => {
    const unique = new Set(lots.map((lot) => lot.category).filter(Boolean))
    return [ALL_CATEGORIES, ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [lots])

  const visibleLots = useMemo(
    () =>
      [...lots]
        .filter((lot) => !dismissedIds.has(lot.id))
        .filter((lot) => category === ALL_CATEGORIES || lot.category === category)
        .sort(byDiscoveredNewest),
    [lots, category, dismissedIds],
  )

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-ink-navy font-bold">Discovered lots</h1>
          {categories.length > 1 ? (
            <SelectField
              label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
              }}
              className="min-w-48"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          ) : null}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {lotsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : visibleLots.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              message={
                lots.length === 0
                  ? 'No discovered lots yet - check back after the next scrape.'
                  : 'No lots in this category right now.'
              }
            />
          ) : (
            <>
              {/* PALLETIQ-050: cards below `md` (docs/design/mobile-responsive.md's
                  Discovered Lots exception), table unchanged at `md`+. Both render
                  in the DOM; Tailwind display classes toggle visibility. */}
              <div data-testid="lots-cards" className="flex flex-col gap-3 md:hidden">
                {visibleLots.map((lot) => (
                  <LotCard
                    key={lot.id}
                    lot={lot}
                    lotImport={imports.get(lot.id)}
                    canWrite={canWrite}
                    onImport={(lotId) => {
                      importMutation.mutate(lotId)
                    }}
                    importPending={importMutation.isPending}
                    onDismiss={onDismiss}
                  />
                ))}
              </div>

              <div data-testid="lots-table" className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-label text-slate-gray">
                      <th className="px-2 py-2 font-medium">Title</th>
                      <th className="px-2 py-2 font-medium">Category</th>
                      <th className="px-2 py-2 font-medium">Condition</th>
                      <th className="px-2 py-2 text-right font-medium">Units</th>
                      <th className="px-2 py-2 text-right font-medium">MSRP</th>
                      <th className="px-2 py-2 text-right font-medium">Price</th>
                      <th className="px-2 py-2 font-medium">Discovered</th>
                      {canWrite ? <th className="px-2 py-2 font-medium">Import</th> : null}
                      {canWrite ? <th className="px-2 py-2 font-medium">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLots.map((lot, i) => {
                      const lotImport = imports.get(lot.id)
                      return (
                        <tr
                          key={lot.id}
                          className={`text-body text-ink-navy ${i % 2 === 1 ? 'bg-cloud-gray' : ''}`}
                        >
                          <td className="px-2 py-2">
                            <a
                              href={lot.productUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-blue inline-flex items-center gap-1 hover:underline"
                            >
                              {lot.title}
                              <ExternalLink size={14} />
                            </a>
                          </td>
                          <td className="px-2 py-2">{lot.category}</td>
                          <td className="px-2 py-2">{lot.condition}</td>
                          <td className="px-2 py-2 text-right">{lot.units}</td>
                          <td className="px-2 py-2 text-right">{formatMoney(lot.msrp)}</td>
                          <td className="px-2 py-2 text-right">{formatMoney(lot.price)}</td>
                          <td className="px-2 py-2">
                            {lot.firstSeenAt.toDate().toLocaleDateString()}
                          </td>
                          {canWrite ? (
                            <td className="px-2 py-2">
                              {lotImport?.status === 'queued' ||
                              lotImport?.status === 'processing' ? (
                                <span
                                  className={`inline-flex items-center gap-2 ${IMPORT_STATUS_STYLES[lotImport.status]}`}
                                >
                                  <Spinner className="h-4 w-4" />
                                  {lotImport.status === 'processing' ? 'Importing…' : 'Queued…'}
                                </span>
                              ) : lotImport?.status === 'completed' ? (
                                <Link
                                  to={`/manifests/${lotImport.id}`}
                                  className={`font-medium hover:underline ${IMPORT_STATUS_STYLES.completed}`}
                                >
                                  Imported
                                </Link>
                              ) : lot.hasManifest ? (
                                <div className="flex flex-col items-start gap-1">
                                  <Button
                                    className="min-h-11"
                                    disabled={importMutation.isPending}
                                    onClick={() => {
                                      importMutation.mutate(lot.id)
                                    }}
                                  >
                                    {lotImport?.status === 'failed' ? 'Try again' : 'Import'}
                                  </Button>
                                  {lotImport?.status === 'failed' ? (
                                    <span className={`text-label ${IMPORT_STATUS_STYLES.failed}`}>
                                      Import failed
                                    </span>
                                  ) : null}
                                </div>
                              ) : (
                                <span className="text-slate-gray">—</span>
                              )}
                            </td>
                          ) : null}
                          {canWrite ? (
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                aria-label={`Remove ${lot.title}`}
                                onClick={() => {
                                  onDismiss(lot)
                                }}
                                className="text-danger cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

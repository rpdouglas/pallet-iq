import { useState } from 'react'
import { ExternalLink, Gavel, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { WatchlistLotForm } from '../components/WatchlistLotForm'
import { useAuth } from '../lib/auth/useAuth'
import {
  createWatchlistLot,
  deleteWatchlistLot,
  listWatchlistLots,
} from '../lib/watchlist/watchlistActions'
import { WATCHLIST_LOT_SOURCE_LABELS, type WatchlistLot } from '../types/watchlistLot'
import type { WatchlistLotFormValues } from '../lib/watchlist/schemas'

type Mode = { kind: 'list' } | { kind: 'add' }

// Closes-soonest first; lots with no closesAt (not always visible on a
// listing page) sort last rather than first, so an unknown close time
// doesn't masquerade as "closes now." First real client-side time-based
// sort in the app.
function byClosesSoonest(a: WatchlistLot, b: WatchlistLot): number {
  if (a.closesAt === null && b.closesAt === null) return 0
  if (a.closesAt === null) return 1
  if (b.closesAt === null) return -1
  return new Date(a.closesAt).getTime() - new Date(b.closesAt).getTime()
}

export function WatchlistPage() {
  const { tenantId, role } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  // Owner + Buyer write, matching ADR-0009/ADR-0006's isOwnerOrBuyer rule -
  // sourcing is Buyer's core daily job, not an admin-only task.
  const canWrite = role === 'owner' || role === 'buyer'

  const lotsQuery = useQuery({
    queryKey: ['watchlistLots', tenantId],
    queryFn: () => listWatchlistLots(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['watchlistLots', tenantId] })

  const createMutation = useMutation({
    mutationFn: (values: WatchlistLotFormValues) => createWatchlistLot(tenantId ?? '', values),
    onSuccess: () => {
      void invalidate()
      setMode({ kind: 'list' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (lotId: string) => deleteWatchlistLot(tenantId ?? '', lotId),
    onSuccess: () => {
      void invalidate()
    },
  })

  const onDelete = (lot: WatchlistLot) => {
    if (window.confirm(`Remove "${lot.title}" from the watchlist?`)) {
      deleteMutation.mutate(lot.id)
    }
  }

  const lots = [...(lotsQuery.data ?? [])].sort(byClosesSoonest)

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-h1 text-ink-navy font-bold">Watchlist</h1>
          {canWrite && mode.kind === 'list' && lots.length > 0 ? (
            <Button
              onClick={() => {
                setMode({ kind: 'add' })
              }}
            >
              <Plus className="mr-1 inline-block" size={16} />
              Add lot
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {mode.kind === 'add' ? (
            <WatchlistLotForm
              onSubmit={(values) => createMutation.mutateAsync(values)}
              onCancel={() => {
                setMode({ kind: 'list' })
              }}
            />
          ) : lotsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : lots.length === 0 ? (
            <EmptyState
              icon={Gavel}
              message="No watchlist lots yet."
              action={
                canWrite ? (
                  <Button
                    onClick={() => {
                      setMode({ kind: 'add' })
                    }}
                  >
                    Add your first lot
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-label text-slate-gray">
                    <th className="px-2 py-2 font-medium">Title</th>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 text-right font-medium">Units</th>
                    <th className="px-2 py-2 text-right font-medium">Current bid</th>
                    <th className="px-2 py-2 font-medium">Closes</th>
                    {canWrite ? <th className="px-2 py-2 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, i) => (
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
                      <td className="px-2 py-2">{WATCHLIST_LOT_SOURCE_LABELS[lot.source]}</td>
                      <td className="px-2 py-2">
                        {lot.category || <span className="text-slate-gray">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {lot.units ?? <span className="text-slate-gray">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {lot.currentBid !== null ? (
                          `$${lot.currentBid.toFixed(2)}`
                        ) : (
                          <span className="text-slate-gray">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {lot.closesAt ? (
                          new Date(lot.closesAt).toLocaleString()
                        ) : (
                          <span className="text-slate-gray">—</span>
                        )}
                      </td>
                      {canWrite ? (
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            aria-label={`Remove ${lot.title}`}
                            onClick={() => {
                              onDelete(lot)
                            }}
                            className="text-danger cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

import { useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/EmptyState'
import { ItemScanCapture } from '../components/ItemScanCapture'
import { useAuth } from '../lib/auth/useAuth'
import {
  enqueueItemScan,
  getItemScan,
  newScanId,
  selectItemScanCandidate,
  uploadScanPhoto,
} from '../lib/itemScans/itemScanActions'
import { CONDITION_GRADE_LABELS } from '../types/itemScan'
import type { ItemScanCandidate } from '../types/itemScan'
import { Button } from '../components/Button'

type Mode = { kind: 'capture' } | { kind: 'result'; scanId: string }

function CandidateCard({ candidate }: { candidate: ItemScanCandidate }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-h2 text-ink-navy font-semibold">{candidate.itemName}</h2>
        <span className="text-label text-slate-gray shrink-0">
          {Math.round(candidate.confidence * 100)}% confident
        </span>
      </div>
      <dl className="text-body grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-slate-gray">Brand</dt>
        <dd className="text-ink-navy">{candidate.brand ?? '—'}</dd>
        <dt className="text-slate-gray">Model</dt>
        <dd className="text-ink-navy">{candidate.model ?? '—'}</dd>
        <dt className="text-slate-gray">Category</dt>
        <dd className="text-ink-navy">{candidate.category}</dd>
        <dt className="text-slate-gray">Dimensions</dt>
        <dd className="text-ink-navy">{candidate.dimensions ?? '—'}</dd>
        <dt className="text-slate-gray">Condition</dt>
        <dd className="text-ink-navy">{CONDITION_GRADE_LABELS[candidate.condition]}</dd>
      </dl>
      <p className="text-label text-slate-gray">{candidate.conditionJustification}</p>
      {candidate.notableFeatures ? (
        <p className="text-label text-slate-gray">{candidate.notableFeatures}</p>
      ) : null}
    </div>
  )
}

export function ItemScanPage() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>({ kind: 'capture' })

  const scanQuery = useQuery({
    queryKey: ['itemScan', tenantId, mode.kind === 'result' ? mode.scanId : null],
    queryFn: () => getItemScan(tenantId ?? '', mode.kind === 'result' ? mode.scanId : ''),
    enabled: !!tenantId && mode.kind === 'result',
    // Identification runs asynchronously (queued -> processing ->
    // completed/failed) server-side, same polling posture as
    // ManifestsPage's import status.
    refetchInterval: (query) =>
      query.state.data?.status === 'queued' || query.state.data?.status === 'processing'
        ? 2000
        : false,
  })

  const scanMutation = useMutation({
    mutationFn: async (photos: File[]) => {
      if (!tenantId) {
        throw new Error('No tenant.')
      }
      const scanId = newScanId(tenantId)
      const photoPaths = await Promise.all(
        photos.map(async (photo, index) => {
          const { storagePath } = await uploadScanPhoto(tenantId, scanId, index, photo)
          return storagePath
        }),
      )
      await enqueueItemScan({ scanId, photoPaths })
      return scanId
    },
    onSuccess: (scanId) => {
      setMode({ kind: 'result', scanId })
    },
  })

  const selectMutation = useMutation({
    mutationFn: (candidateIndex: number) => {
      if (!tenantId || mode.kind !== 'result') {
        throw new Error('No active scan.')
      }
      return selectItemScanCandidate(tenantId, mode.scanId, candidateIndex)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['itemScan', tenantId] })
    },
  })

  const scan = scanQuery.data
  const selectedCandidate =
    scan?.selectedCandidateIndex !== null && scan?.selectedCandidateIndex !== undefined
      ? scan.candidates[scan.selectedCandidateIndex]
      : undefined

  return (
    <main className="bg-cloud-gray min-h-svh p-4 sm:p-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-h1 text-ink-navy font-bold">Scan item</h1>

        {mode.kind === 'capture' ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <ItemScanCapture
              onSubmit={async (photos) => {
                await scanMutation.mutateAsync(photos)
              }}
            />
          </div>
        ) : null}

        {mode.kind === 'result' &&
        (scanQuery.isLoading ||
          !scan ||
          scan.status === 'queued' ||
          scan.status === 'processing') ? (
          <div className="flex flex-col gap-2 rounded-xl bg-white p-6 shadow-sm">
            <div className="bg-cloud-gray h-6 w-2/3 animate-pulse rounded-lg" />
            <div className="bg-cloud-gray h-24 animate-pulse rounded-lg" />
            <p className="text-label text-slate-gray">Identifying item…</p>
          </div>
        ) : null}

        {mode.kind === 'result' && scan?.status === 'failed' ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <EmptyState
              icon={PackageSearch}
              message={scan.error ?? 'Identification failed.'}
              action={
                <Button
                  onClick={() => {
                    setMode({ kind: 'capture' })
                  }}
                >
                  Try again
                </Button>
              }
            />
          </div>
        ) : null}

        {mode.kind === 'result' && scan?.status === 'completed' ? (
          <>
            {selectedCandidate ? (
              <CandidateCard candidate={selectedCandidate} />
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-body text-ink-navy">
                  Not sure which of these matches - pick the closest one.
                </p>
                {scan.candidates.map((candidate, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      selectMutation.mutate(index)
                    }}
                    disabled={selectMutation.isPending}
                    className="min-h-11 text-left disabled:opacity-50"
                  >
                    <CandidateCard candidate={candidate} />
                  </button>
                ))}
              </div>
            )}
            <Button
              variant="secondary"
              className="min-h-11"
              onClick={() => {
                setMode({ kind: 'capture' })
              }}
            >
              Scan another item
            </Button>
          </>
        ) : null}
      </div>
    </main>
  )
}

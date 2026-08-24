import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { TextAreaField } from '../components/form/TextAreaField'
import { useAuth } from '../lib/auth/useAuth'
import { enqueueListingCopy, listPricedItemScans } from '../lib/itemScans/itemScanActions'

function formatMoney(value: number | null): string {
  return value !== null ? `$${value.toFixed(2)}` : '—'
}

// PALLETIQ-030 / ADR-0014. First Manager-only page in the app - browses
// every priced item_scans doc in the tenant (the pre-purchase Buyer
// evaluation record `ADR-0014` deliberately reuses as-is, not routed
// through inventory - see that ADR for why no item_scans<->InventoryItem
// link exists to route through instead) and lets an Owner/Manager
// generate marketplace listing copy per item.
export function ScannedItemsPage() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null)

  const scansQuery = useQuery({
    queryKey: ['pricedItemScans', tenantId],
    queryFn: () => listPricedItemScans(tenantId ?? ''),
    enabled: !!tenantId,
    // Poll while any listed scan is still generating copy - same posture
    // ItemScanPage.tsx already uses for identify/price/saleability.
    refetchInterval: (query) =>
      query.state.data?.some((scan) => scan.listingCopyStatus === 'generating') ? 2000 : false,
  })

  const generateMutation = useMutation({
    mutationFn: (scanId: string) => enqueueListingCopy(scanId),
    onSuccess: (_data, scanId) => {
      setExpandedScanId(scanId)
      void queryClient.invalidateQueries({ queryKey: ['pricedItemScans', tenantId] })
    },
  })

  const scans = scansQuery.data ?? []
  const expandedScan = scans.find((scan) => scan.id === expandedScanId) ?? null
  const expandedCandidate =
    expandedScan && expandedScan.selectedCandidateIndex !== null
      ? expandedScan.candidates[expandedScan.selectedCandidateIndex]
      : null

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <h1 className="text-h1 text-ink-navy font-bold">Scanned items</h1>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {scansQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : scans.length === 0 ? (
            <EmptyState
              icon={FileText}
              message="No priced scans yet - items a Buyer has scanned and priced will show up here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-label text-slate-gray">
                    <th className="px-2 py-2 font-medium">Item</th>
                    <th className="px-2 py-2 font-medium">Category</th>
                    <th className="px-2 py-2 font-medium">Condition</th>
                    <th className="px-2 py-2 text-right font-medium">Sale price</th>
                    <th className="px-2 py-2 font-medium">Listing copy</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan, i) => {
                    const candidate =
                      scan.selectedCandidateIndex !== null
                        ? scan.candidates[scan.selectedCandidateIndex]
                        : null
                    if (!candidate) return null
                    return (
                      <tr
                        key={scan.id}
                        className={`text-body text-ink-navy ${i % 2 === 1 ? 'bg-cloud-gray' : ''}`}
                      >
                        <td className="px-2 py-2">{candidate.itemName}</td>
                        <td className="px-2 py-2">{candidate.category}</td>
                        <td className="px-2 py-2">{candidate.condition}</td>
                        <td className="px-2 py-2 text-right">
                          {formatMoney(scan.pricing?.salePrice ?? null)}
                        </td>
                        <td className="px-2 py-2">
                          {scan.listingCopyStatus === 'generating' ? (
                            <span className="text-slate-gray inline-flex items-center gap-2">
                              <Spinner className="h-4 w-4" />
                              Generating…
                            </span>
                          ) : scan.listingCopyStatus === 'generated' ? (
                            <Button
                              variant="secondary"
                              className="min-h-11"
                              onClick={() => {
                                setExpandedScanId(scan.id)
                              }}
                            >
                              View / edit
                            </Button>
                          ) : (
                            <Button
                              className="min-h-11"
                              disabled={generateMutation.isPending}
                              onClick={() => {
                                generateMutation.mutate(scan.id)
                              }}
                            >
                              {scan.listingCopyStatus === 'failed'
                                ? 'Try again'
                                : 'Generate listing copy'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {expandedScan?.listingCopy ? (
          <div className="flex flex-col gap-3 rounded-xl bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-h2 text-ink-navy font-semibold">{expandedCandidate?.itemName}</h2>
              <Button
                variant="secondary"
                className="min-h-11"
                onClick={() => {
                  setExpandedScanId(null)
                }}
              >
                Close
              </Button>
            </div>
            <TextAreaField
              label="Listing title"
              defaultValue={expandedScan.listingCopy.title}
              rows={2}
            />
            <TextAreaField
              label="Listing description"
              defaultValue={expandedScan.listingCopy.description}
              rows={8}
            />
            <p className="text-label text-slate-gray">
              Edit freely before pasting into a marketplace listing - nothing here is published
              automatically.
            </p>
            <Button
              variant="secondary"
              className="min-h-11 self-start"
              disabled={generateMutation.isPending}
              onClick={() => {
                generateMutation.mutate(expandedScan.id)
              }}
            >
              Regenerate
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  )
}

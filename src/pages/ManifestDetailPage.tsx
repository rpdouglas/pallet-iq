import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth/useAuth'
import {
  enqueueLotProfitabilityScore,
  getImport,
  listImportErrors,
  listLineItems,
  updateImportCosts,
} from '../lib/manifests/manifestActions'
import {
  calculateLandedCost,
  calculateLandedCostMultiplier,
  calculateTotalPurchaseValue,
} from '../lib/manifests/landedCost'
import { Button } from '../components/Button'
import { LandedCostForm } from '../components/LandedCostForm'
import { LotProfitabilityPanel } from '../components/LotProfitabilityPanel'
import { Spinner } from '../components/Spinner'

export function ManifestDetailPage() {
  const { importId } = useParams<{ importId: string }>()
  const { tenantId, role } = useAuth()
  const queryClient = useQueryClient()
  const canSeeCost = role !== 'warehouse'
  const canManageCosts = role === 'owner' || role === 'buyer'

  const importQuery = useQuery({
    queryKey: ['imports', tenantId, importId],
    queryFn: () => getImport(tenantId ?? '', importId ?? ''),
    enabled: !!tenantId && !!importId,
    // PALLETIQ-042: profitability scoring runs async server-side
    // (lotProfitabilityWorker.ts) - poll while it's in flight, same
    // posture ManifestsPage.tsx/ScannedItemsPage.tsx already use.
    refetchInterval: (query) =>
      query.state.data?.profitabilityStatus === 'scoring' ? 2000 : false,
  })

  const lineItemsQuery = useQuery({
    queryKey: ['lineItems', tenantId, importId],
    queryFn: () => listLineItems(tenantId ?? '', importId ?? ''),
    enabled: !!tenantId && !!importId,
  })

  const errorsQuery = useQuery({
    queryKey: ['importErrors', tenantId, importId],
    queryFn: () => listImportErrors(tenantId ?? '', importId ?? ''),
    enabled: !!tenantId && !!importId && (importQuery.data?.errorCount ?? 0) > 0,
  })

  const costsMutation = useMutation({
    mutationFn: (values: { freightCost: number; otherFees: number }) =>
      updateImportCosts(tenantId ?? '', importId ?? '', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports', tenantId, importId] })
    },
  })

  const profitabilityMutation = useMutation({
    mutationFn: () => enqueueLotProfitabilityScore(importId ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports', tenantId, importId] })
    },
  })

  const lineItems = lineItemsQuery.data ?? []
  const errors = errorsQuery.data ?? []

  // PALLETIQ-009: value-weighted allocation - every line item in this
  // import gets the same % markup, computed once from the import's totals.
  const totalPurchaseValue = calculateTotalPurchaseValue(lineItems)
  const landedCostMultiplier = calculateLandedCostMultiplier(
    totalPurchaseValue,
    importQuery.data?.freightCost ?? 0,
    importQuery.data?.otherFees ?? 0,
  )
  const markupPercent = ((landedCostMultiplier - 1) * 100).toFixed(1)

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-h1 text-ink-navy font-bold">
            {importQuery.data ? importQuery.data.fileName : 'Manifest'}
          </h1>
          {importQuery.data ? (
            <p className="text-label text-slate-gray">
              Status: {importQuery.data.status} · {importQuery.data.successCount} imported
              {importQuery.data.errorCount > 0
                ? `, ${importQuery.data.errorCount.toString()} errors`
                : ''}
            </p>
          ) : null}
          {importQuery.data?.status === 'failed' && importQuery.data.error ? (
            <p className="text-label text-danger">{importQuery.data.error}</p>
          ) : null}
        </div>

        {canManageCosts && importQuery.data ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-h2 text-ink-navy mb-2 font-semibold">Shipping &amp; fees</h2>
            <LandedCostForm
              initialValues={{
                freightCost: importQuery.data.freightCost,
                otherFees: importQuery.data.otherFees,
              }}
              onSubmit={(values) => costsMutation.mutateAsync(values)}
            />
            {canSeeCost && totalPurchaseValue > 0 ? (
              <p className="text-label text-slate-gray mt-2">
                Adds {markupPercent}% to every item&apos;s landed cost.
              </p>
            ) : null}
          </div>
        ) : null}

        {canManageCosts && importQuery.data?.status === 'completed' ? (
          <>
            {importQuery.data.profitabilityStatus === 'scored' && importQuery.data.profitability ? (
              <LotProfitabilityPanel profitability={importQuery.data.profitability} />
            ) : (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="text-h2 text-ink-navy mb-2 font-semibold">Profitability</h2>
                {importQuery.data.profitabilityStatus === 'scoring' ? (
                  <span className="text-label text-brand-blue inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Scoring…
                  </span>
                ) : (
                  <div className="flex flex-col items-start gap-1">
                    <Button
                      className="min-h-11"
                      disabled={profitabilityMutation.isPending}
                      onClick={() => {
                        profitabilityMutation.mutate()
                      }}
                    >
                      {importQuery.data.profitabilityStatus === 'failed'
                        ? 'Try again'
                        : 'Score profitability'}
                    </Button>
                    {importQuery.data.profitabilityStatus === 'failed' &&
                    importQuery.data.profitabilityError ? (
                      <span className="text-label text-danger">
                        {importQuery.data.profitabilityError}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {lineItemsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : lineItems.length === 0 ? (
            <p className="text-body text-slate-gray">No line items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-label text-slate-gray">
                    <th className="px-2 py-2 font-medium">Description</th>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 text-right font-medium">Qty</th>
                    {canSeeCost ? (
                      <th className="px-2 py-2 text-right font-medium">Unit cost</th>
                    ) : null}
                    {canSeeCost ? (
                      <th className="px-2 py-2 text-right font-medium">Landed cost</th>
                    ) : null}
                    <th className="px-2 py-2 font-medium">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr
                      key={item.id}
                      className={`text-body text-ink-navy ${i % 2 === 1 ? 'bg-cloud-gray' : ''}`}
                    >
                      <td className="px-2 py-2">{item.description}</td>
                      <td className="px-2 py-2">
                        {item.sku ?? <span className="text-slate-gray">—</span>}
                      </td>
                      <td className="px-2 py-2 text-right">{item.quantity}</td>
                      {canSeeCost ? (
                        <td className="px-2 py-2 text-right">${item.unitCost.toFixed(2)}</td>
                      ) : null}
                      {canSeeCost ? (
                        <td className="px-2 py-2 text-right">
                          ${calculateLandedCost(item.unitCost, landedCostMultiplier).toFixed(2)}
                        </td>
                      ) : null}
                      <td className="px-2 py-2">
                        {item.condition ?? <span className="text-slate-gray">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {errors.length > 0 ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-h2 text-ink-navy mb-2 font-semibold">
              Rows that couldn&apos;t be imported
            </h2>
            <table className="w-full text-left">
              <thead>
                <tr className="text-label text-slate-gray">
                  <th className="px-2 py-2 text-right font-medium">Row</th>
                  <th className="px-2 py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((error, i) => (
                  <tr
                    key={error.id}
                    className={`text-body text-danger ${i % 2 === 1 ? 'bg-cloud-gray' : ''}`}
                  >
                    <td className="px-2 py-2 text-right">{error.rowNumber}</td>
                    <td className="px-2 py-2">{error.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  )
}

import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth/useAuth'
import { getImport, listImportErrors, listLineItems } from '../lib/manifests/manifestActions'

export function ManifestDetailPage() {
  const { importId } = useParams<{ importId: string }>()
  const { tenantId, role } = useAuth()
  const canSeeCost = role !== 'warehouse'

  const importQuery = useQuery({
    queryKey: ['imports', tenantId, importId],
    queryFn: () => getImport(tenantId ?? '', importId ?? ''),
    enabled: !!tenantId && !!importId,
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

  const lineItems = lineItemsQuery.data ?? []
  const errors = errorsQuery.data ?? []

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div>
          <Link to="/manifests" className="text-label text-brand-blue">
            ← Back to manifests
          </Link>
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
        </div>

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

import { FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { buttonClasses } from '../components/buttonVariants'
import { EmptyState } from '../components/EmptyState'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../lib/auth/useAuth'
import { listVendors } from '../lib/vendors/vendorActions'
import { listImports } from '../lib/manifests/manifestActions'

const STATUS_STYLES: Record<string, string> = {
  queued: 'text-slate-gray',
  processing: 'text-brand-blue',
  completed: 'text-success',
  failed: 'text-danger',
}

// PALLETIQ-010. Only real data - no "today's opportunities" (Phase 2
// scoring) or "inventory totals" (PALLETIQ-011) cards, neither has a data
// source yet. See the PALLETIQ-010 scope note in docs/BACKLOG.md.
export function DashboardPage() {
  const { tenantId } = useAuth()

  const vendorsQuery = useQuery({
    queryKey: ['vendors', tenantId],
    queryFn: () => listVendors(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const importsQuery = useQuery({
    queryKey: ['imports', tenantId],
    queryFn: () => listImports(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const vendors = vendorsQuery.data ?? []
  const imports = importsQuery.data ?? []
  const vendorName = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name ?? vendorId
  const totalLineItems = imports.reduce((sum, item) => sum + item.successCount, 0)
  const totalErrors = imports.reduce((sum, item) => sum + item.errorCount, 0)
  const recentImports = imports.slice(0, 5)

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <h1 className="text-h1 text-ink-navy font-bold">Dashboard</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Vendors" value={vendors.length} />
          <StatCard label="Manifests imported" value={imports.length} />
          <StatCard label="Line items imported" value={totalLineItems} />
          <StatCard label="Import errors" value={totalErrors} />
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-h2 text-ink-navy mb-2 font-semibold">Recent imports</h2>
          {importsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recentImports.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              message="No imports yet."
              action={
                <Link to="/manifests" className={buttonClasses()}>
                  Import a manifest
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-label text-slate-gray">
                    <th className="px-2 py-2 font-medium">Vendor</th>
                    <th className="px-2 py-2 font-medium">Format</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentImports.map((item, i) => (
                    <tr
                      key={item.id}
                      className={`text-body text-ink-navy ${i % 2 === 1 ? 'bg-cloud-gray' : ''}`}
                    >
                      <td className="px-2 py-2">
                        <Link to={`/manifests/${item.id}`} className="text-brand-blue">
                          {vendorName(item.vendorId)}
                        </Link>
                      </td>
                      <td className="px-2 py-2">{item.format.toUpperCase()}</td>
                      <td className={`px-2 py-2 font-medium ${STATUS_STYLES[item.status] ?? ''}`}>
                        {item.status}
                      </td>
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

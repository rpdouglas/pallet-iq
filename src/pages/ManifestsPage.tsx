import { useState } from 'react'
import { FileSpreadsheet, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { ImportForm } from '../components/ImportForm'
import { useAuth } from '../lib/auth/useAuth'
import { listVendors } from '../lib/vendors/vendorActions'
import {
  enqueueManifestImport,
  listImports,
  newImportId,
  uploadManifestFile,
} from '../lib/manifests/manifestActions'

const STATUS_STYLES: Record<string, string> = {
  queued: 'text-slate-gray',
  processing: 'text-brand-blue',
  completed: 'text-success',
  failed: 'text-danger',
}

export function ManifestsPage() {
  const { tenantId, role } = useAuth()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const canImport = role === 'owner' || role === 'buyer'

  const vendorsQuery = useQuery({
    queryKey: ['vendors', tenantId],
    queryFn: () => listVendors(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const importsQuery = useQuery({
    queryKey: ['imports', tenantId],
    queryFn: () => listImports(tenantId ?? ''),
    enabled: !!tenantId,
    // Import status transitions asynchronously (queued -> processing ->
    // completed/failed) server-side - poll while any row is still moving.
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.status === 'queued' || item.status === 'processing')
        ? 2000
        : false,
  })

  const importMutation = useMutation({
    mutationFn: async ({
      vendorId,
      file,
      totalPurchasePrice,
    }: {
      vendorId: string
      file: File
      totalPurchasePrice?: number
    }) => {
      if (!tenantId) {
        throw new Error('No tenant.')
      }
      const importId = newImportId(tenantId)
      const { storagePath } = await uploadManifestFile(tenantId, importId, file)
      await enqueueManifestImport({
        vendorId,
        importId,
        storagePath,
        fileName: file.name,
        totalPurchasePrice,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['imports', tenantId] })
      setShowForm(false)
    },
  })

  const vendors = vendorsQuery.data ?? []
  const imports = importsQuery.data ?? []
  const vendorName = (vendorId: string) => vendors.find((v) => v.id === vendorId)?.name ?? vendorId

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-h1 text-ink-navy font-bold">Manifests</h1>
          {canImport && !showForm && imports.length > 0 ? (
            <Button
              onClick={() => {
                setShowForm(true)
              }}
            >
              <Plus className="mr-1 inline-block" size={16} />
              Import manifest
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {showForm ? (
            <ImportForm
              vendors={vendors}
              onSubmit={(values) => importMutation.mutateAsync(values)}
              onCancel={() => {
                setShowForm(false)
              }}
            />
          ) : importsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : imports.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              message="No imports yet."
              action={
                canImport ? (
                  <Button
                    onClick={() => {
                      setShowForm(true)
                    }}
                  >
                    Import a manifest
                  </Button>
                ) : undefined
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
                    <th className="px-2 py-2 text-right font-medium">Rows</th>
                    <th className="px-2 py-2 text-right font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.map((item, i) => (
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
                      <td className="px-2 py-2 text-right">{item.successCount}</td>
                      <td className="px-2 py-2 text-right">{item.errorCount}</td>
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

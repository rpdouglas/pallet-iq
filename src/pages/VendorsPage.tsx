import { useState } from 'react'
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { VendorForm } from '../components/VendorForm'
import { useAuth } from '../lib/auth/useAuth'
import { createVendor, deleteVendor, listVendors, updateVendor } from '../lib/vendors/vendorActions'
import type { Vendor } from '../types/vendor'
import type { VendorFormValues } from '../lib/vendors/schemas'

type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; vendor: Vendor }

export function VendorsPage() {
  const { tenantId, role } = useAuth()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  const isOwner = role === 'owner'
  // Pricing/terms is the field docs/design/rbac-ui-patterns.md and
  // docs/personas/warehouse.md call out as denied to Warehouse - the vendors
  // route itself stays reachable (unlike PALLETIQ-006's route-level denials).
  const canSeeTerms = role !== 'warehouse'

  const vendorsQuery = useQuery({
    queryKey: ['vendors', tenantId],
    queryFn: () => listVendors(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['vendors', tenantId] })

  const createMutation = useMutation({
    mutationFn: (values: VendorFormValues) => createVendor(tenantId ?? '', values),
    onSuccess: () => {
      void invalidate()
      setMode({ kind: 'list' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ vendorId, values }: { vendorId: string; values: VendorFormValues }) =>
      updateVendor(tenantId ?? '', vendorId, values),
    onSuccess: () => {
      void invalidate()
      setMode({ kind: 'list' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (vendorId: string) => deleteVendor(tenantId ?? '', vendorId),
    onSuccess: () => {
      void invalidate()
    },
  })

  const onDelete = (vendor: Vendor) => {
    if (window.confirm(`Delete ${vendor.name}? This can't be undone.`)) {
      deleteMutation.mutate(vendor.id)
    }
  }

  const vendors = vendorsQuery.data ?? []

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-h1 text-ink-navy font-bold">Vendors</h1>
          {isOwner && mode.kind === 'list' && vendors.length > 0 ? (
            <Button
              onClick={() => {
                setMode({ kind: 'add' })
              }}
            >
              <Plus className="mr-1 inline-block" size={16} />
              Add vendor
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {mode.kind === 'add' ? (
            <VendorForm
              submitLabel="Add vendor"
              onSubmit={(values) => createMutation.mutateAsync(values)}
              onCancel={() => {
                setMode({ kind: 'list' })
              }}
            />
          ) : mode.kind === 'edit' ? (
            <VendorForm
              submitLabel="Save changes"
              initialValues={{
                name: mode.vendor.name,
                manifestFormat: mode.vendor.manifestFormat,
                contactEmail: mode.vendor.contactEmail,
                contactPhone: mode.vendor.contactPhone,
                terms: mode.vendor.terms,
              }}
              onSubmit={(values) =>
                updateMutation.mutateAsync({ vendorId: mode.vendor.id, values })
              }
              onCancel={() => {
                setMode({ kind: 'list' })
              }}
            />
          ) : vendorsQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <EmptyState
              icon={Building2}
              message="No vendors yet."
              action={
                isOwner ? (
                  <Button
                    onClick={() => {
                      setMode({ kind: 'add' })
                    }}
                  >
                    Add your first vendor
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-label text-slate-gray">
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Format</th>
                    <th className="px-2 py-2 font-medium">Contact</th>
                    {canSeeTerms ? <th className="px-2 py-2 font-medium">Terms</th> : null}
                    {isOwner ? <th className="px-2 py-2 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor, i) => (
                    <tr
                      key={vendor.id}
                      className={`text-body text-ink-navy ${i % 2 === 1 ? 'bg-cloud-gray' : ''}`}
                    >
                      <td className="px-2 py-2">{vendor.name}</td>
                      <td className="px-2 py-2">{vendor.manifestFormat.toUpperCase()}</td>
                      <td className="px-2 py-2">
                        {vendor.contactEmail || vendor.contactPhone ? (
                          <>
                            {vendor.contactEmail}
                            {vendor.contactEmail && vendor.contactPhone ? ' · ' : ''}
                            {vendor.contactPhone}
                          </>
                        ) : (
                          <span className="text-slate-gray">—</span>
                        )}
                      </td>
                      {canSeeTerms ? (
                        <td className="px-2 py-2">
                          {vendor.terms || <span className="text-slate-gray">—</span>}
                        </td>
                      ) : null}
                      {isOwner ? (
                        <td className="px-2 py-2">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              aria-label={`Edit ${vendor.name}`}
                              onClick={() => {
                                setMode({ kind: 'edit', vendor })
                              }}
                              className="text-brand-blue cursor-pointer"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${vendor.name}`}
                              onClick={() => {
                                onDelete(vendor)
                              }}
                              className="text-danger cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

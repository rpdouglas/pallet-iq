import { Boxes } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../lib/auth/useAuth'
import { listInventory, updateInventoryStatus } from '../lib/inventory/inventoryActions'
import { INVENTORY_STATUS_ORDER } from '../types/inventory'
import type { InventoryStatus } from '../types/inventory'

const STATUS_STYLES: Record<InventoryStatus, string> = {
  purchased: 'text-slate-gray',
  received: 'text-brand-blue',
  // Not text-cyan-accent - Pallet-IQ-Design-System.md §2 scopes Cyan Accent
  // to gradients/icons/decorative surfaces, and it fails body-text contrast
  // (~2.43:1) against white/Cloud Gray.
  listed: 'text-ink-navy',
  sold: 'text-success',
}

const STATUS_LABELS: Record<InventoryStatus, string> = {
  purchased: 'Purchased',
  received: 'Received',
  listed: 'Listed',
  sold: 'Sold',
}

function nextStatus(status: InventoryStatus): InventoryStatus | null {
  const i = INVENTORY_STATUS_ORDER.indexOf(status)
  return i < INVENTORY_STATUS_ORDER.length - 1 ? (INVENTORY_STATUS_ORDER[i + 1] ?? null) : null
}

// PALLETIQ-011 / ADR-0007. Basic Purchased -> Received -> Listed -> Sold
// tracking - a standard desktop page inside the existing AppShell, not a
// new mobile-first surface (see the PALLETIQ-011 scope note in
// docs/BACKLOG.md correcting PALLETIQ-010's assumption). One "advance"
// action is offered to every writer role (Owner/Manager/Warehouse) alike -
// no per-transition-per-role restriction, per ADR-0007.
export function InventoryPage() {
  const { tenantId, role } = useAuth()
  const queryClient = useQueryClient()

  const canSeeCost = role !== 'warehouse'
  const canWrite = role === 'owner' || role === 'manager' || role === 'warehouse'

  const inventoryQuery = useQuery({
    queryKey: ['inventory', tenantId],
    queryFn: () => listInventory(tenantId ?? ''),
    enabled: !!tenantId,
  })

  const advanceMutation = useMutation({
    mutationFn: ({ inventoryId, status }: { inventoryId: string; status: InventoryStatus }) =>
      updateInventoryStatus(tenantId ?? '', inventoryId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', tenantId] })
    },
  })

  const inventory = inventoryQuery.data ?? []

  return (
    <main className="bg-cloud-gray min-h-svh p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <h1 className="text-h1 text-ink-navy font-bold">Inventory</h1>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {inventoryQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-cloud-gray h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : inventory.length === 0 ? (
            <EmptyState
              icon={Boxes}
              message="No inventory yet. Import a manifest to get started."
            />
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
                    <th className="px-2 py-2 font-medium">Status</th>
                    {canWrite ? <th className="px-2 py-2 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, i) => {
                    const next = nextStatus(item.status)
                    return (
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
                        <td className={`px-2 py-2 font-medium ${STATUS_STYLES[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </td>
                        {canWrite ? (
                          <td className="px-2 py-2">
                            {next ? (
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  advanceMutation.mutate({ inventoryId: item.id, status: next })
                                }}
                                disabled={
                                  advanceMutation.isPending &&
                                  advanceMutation.variables.inventoryId === item.id
                                }
                              >
                                Mark {STATUS_LABELS[next]}
                              </Button>
                            ) : (
                              <span className="text-slate-gray">—</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

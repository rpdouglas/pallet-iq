export type InventoryStatus = 'purchased' | 'received' | 'listed' | 'sold'

export const INVENTORY_STATUS_ORDER: readonly InventoryStatus[] = [
  'purchased',
  'received',
  'listed',
  'sold',
]

export interface InventoryItem {
  id: string
  lineItemId: string
  manifestId: string
  vendorId: string
  sku: string | null
  upc: string | null
  description: string
  quantity: number
  unitCost: number
  condition: string | null
  category: string | null
  status: InventoryStatus
}

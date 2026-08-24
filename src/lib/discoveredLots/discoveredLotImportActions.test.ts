import { describe, expect, it, vi } from 'vitest'
import type { ImportSummary } from '../../types/manifest'

vi.mock('../firebase', () => ({ app: {} }))

const httpsCallable = vi.fn()
const getFunctions = vi.fn(() => ({}))
vi.mock('firebase/functions', () => ({ getFunctions, httpsCallable }))

const mockListImports = vi.fn<(tenantId: string) => Promise<ImportSummary[]>>()
vi.mock('../manifests/manifestActions', () => ({ listImports: mockListImports }))

const { enqueueDiscoveredLotImport, listDiscoveredLotImports } =
  await import('./discoveredLotImportActions')

function importSummary(overrides: Partial<ImportSummary> = {}): ImportSummary {
  return {
    id: 'import-1',
    vendorId: 'restock-ca',
    format: 'csv',
    fileName: 'restock-lot-lot-1.csv',
    status: 'queued',
    rowCount: 0,
    successCount: 0,
    errorCount: 0,
    error: null,
    freightCost: 0,
    otherFees: 0,
    totalPurchasePrice: 250,
    sourceRestockLotId: 'lot-1',
    ...overrides,
  }
}

describe('discoveredLotImportActions', () => {
  it('enqueueDiscoveredLotImport calls the callable with lotId and returns importId', async () => {
    const call = vi.fn(() => Promise.resolve({ data: { importId: 'import-1' } }))
    httpsCallable.mockReturnValueOnce(call)

    const result = await enqueueDiscoveredLotImport('lot-1')

    expect(httpsCallable).toHaveBeenCalledWith({}, 'enqueueDiscoveredLotImport')
    expect(call).toHaveBeenCalledWith({ lotId: 'lot-1' })
    expect(result).toEqual({ importId: 'import-1' })
  })

  it('listDiscoveredLotImports maps by sourceRestockLotId, ignoring manual (null) imports', async () => {
    mockListImports.mockResolvedValueOnce([
      importSummary({ id: 'import-1', sourceRestockLotId: 'lot-1' }),
      importSummary({ id: 'import-manual', sourceRestockLotId: null }),
      importSummary({ id: 'import-2', sourceRestockLotId: 'lot-2' }),
    ])

    const map = await listDiscoveredLotImports('tenant-a')

    expect(mockListImports).toHaveBeenCalledWith('tenant-a')
    expect(map.size).toBe(2)
    expect(map.get('lot-1')?.id).toBe('import-1')
    expect(map.get('lot-2')?.id).toBe('import-2')
  })

  it('listDiscoveredLotImports keeps only the newest import per lot (first one seen)', async () => {
    mockListImports.mockResolvedValueOnce([
      importSummary({ id: 'import-newest', sourceRestockLotId: 'lot-1' }),
      importSummary({ id: 'import-older', sourceRestockLotId: 'lot-1' }),
    ])

    const map = await listDiscoveredLotImports('tenant-a')

    expect(map.get('lot-1')?.id).toBe('import-newest')
  })
})

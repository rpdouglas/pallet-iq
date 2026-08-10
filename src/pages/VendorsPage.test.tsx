import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import type { Role } from '../types/auth'
import { AuthContext, type AuthState } from '../lib/auth/AuthContext'
import type { Vendor } from '../types/vendor'

const listVendors = vi.fn<(tenantId: string) => Promise<Vendor[]>>()
const createVendor = vi.fn<(...args: unknown[]) => Promise<void>>()
const updateVendor = vi.fn<(...args: unknown[]) => Promise<void>>()
const deleteVendor = vi.fn<(...args: unknown[]) => Promise<void>>()
vi.mock('../lib/vendors/vendorActions', () => ({
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
}))

const { VendorsPage } = await import('./VendorsPage')

const VENDOR: Vendor = {
  id: 'vendor-1',
  name: 'Acme Liquidation',
  manifestFormat: 'csv',
  contactEmail: 'sales@acme.example',
  contactPhone: '555-0100',
  terms: 'Net 30',
}

function renderPage(role: Role) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authState: AuthState = {
    user: {} as User,
    tenantId: 'tenant-a',
    role,
    loading: false,
    refreshClaims: () => Promise.resolve(),
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authState}>
        <MemoryRouter>
          <VendorsPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('VendorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state with an add action for an owner when there are no vendors', async () => {
    listVendors.mockResolvedValueOnce([])
    renderPage('owner')

    expect(await screen.findByText('No vendors yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first vendor' })).toBeInTheDocument()
  })

  it('shows an empty state with no action for a buyer (nothing they can do about it)', async () => {
    listVendors.mockResolvedValueOnce([])
    renderPage('buyer')

    expect(await screen.findByText('No vendors yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
  })

  it('renders the Terms column and edit/delete actions for an owner', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    renderPage('owner')

    expect(await screen.findByText('Acme Liquidation')).toBeInTheDocument()
    expect(screen.getByText('Net 30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Acme Liquidation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Acme Liquidation' })).toBeInTheDocument()
  })

  it('omits the Terms column and all actions for a warehouse-role user', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    renderPage('warehouse')

    expect(await screen.findByText('Acme Liquidation')).toBeInTheDocument()
    expect(screen.queryByText('Net 30')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('shows the Terms column but no actions for a buyer', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    renderPage('buyer')

    expect(await screen.findByText('Acme Liquidation')).toBeInTheDocument()
    expect(screen.getByText('Net 30')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('lets an owner add a vendor', async () => {
    listVendors.mockResolvedValueOnce([])
    createVendor.mockResolvedValueOnce(undefined)
    renderPage('owner')

    fireEvent.click(await screen.findByRole('button', { name: 'Add your first vendor' }))
    fireEvent.change(screen.getByLabelText('Vendor name'), {
      target: { value: 'Acme Liquidation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add vendor' }))

    await waitFor(() => {
      expect(createVendor).toHaveBeenCalledWith('tenant-a', {
        name: 'Acme Liquidation',
        manifestFormat: 'csv',
        contactEmail: '',
        contactPhone: '',
        terms: '',
      })
    })
  })

  it('lets an owner edit a vendor', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    updateVendor.mockResolvedValueOnce(undefined)
    renderPage('owner')

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Acme Liquidation' }))
    const nameField = screen.getByLabelText('Vendor name')
    fireEvent.change(nameField, { target: { value: 'Acme Liquidation Co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateVendor).toHaveBeenCalledWith('tenant-a', 'vendor-1', {
        name: 'Acme Liquidation Co',
        manifestFormat: 'csv',
        contactEmail: 'sales@acme.example',
        contactPhone: '555-0100',
        terms: 'Net 30',
      })
    })
  })

  it('lets an owner delete a vendor after confirming', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    deleteVendor.mockResolvedValueOnce(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage('owner')

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Acme Liquidation' }))

    await waitFor(() => {
      expect(deleteVendor).toHaveBeenCalledWith('tenant-a', 'vendor-1')
    })
  })

  it('does not delete a vendor when the confirmation is declined', async () => {
    listVendors.mockResolvedValueOnce([VENDOR])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage('owner')

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Acme Liquidation' }))

    expect(deleteVendor).not.toHaveBeenCalled()
  })
})

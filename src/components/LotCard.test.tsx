import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ImportSummary } from '../types/manifest'
import type { RestockLot } from '../types/restockLot'
import { LotCard } from './LotCard'

function timestamp(ms: number) {
  return { toMillis: () => ms, toDate: () => new Date(ms) } as RestockLot['firstSeenAt']
}

const LOT: RestockLot = {
  id: '1011500',
  title: 'Bosch cordless tool set',
  category: 'Tools',
  units: 12,
  condition: 'Returns',
  msrp: 200,
  price: 150,
  costPerUnit: 26.67,
  vendor: 'Bosch',
  warehouse: 'ON1',
  productUrl: 'https://restock.ca/lot/1011500',
  imageUrl: null,
  manifestUrl: 'https://restock.ca/lot/1011500/manifest.pdf',
  firstSeenAt: timestamp(2_000),
}

function renderCard(overrides: Partial<Parameters<typeof LotCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <LotCard
        lot={LOT}
        lotImport={undefined}
        canWrite
        onImport={vi.fn()}
        importPending={false}
        onDismiss={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  )
}

describe('LotCard', () => {
  it('renders the computed margin percentage', () => {
    renderCard()

    expect(screen.getByText('25%')).toBeInTheDocument() // (200-150)/200 = 25%
  })

  it('renders an em dash for margin when msrp/price is missing', () => {
    renderCard({ lot: { ...LOT, msrp: null } })

    // MSRP's own formatMoney(null) also renders '—', so both it and Margin
    // show the dash here - assert there are (at least) the two expected.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('color-codes the condition badge via the known tone mapping', () => {
    renderCard({ lot: { ...LOT, condition: 'Returns' } })

    expect(screen.getByText('Returns')).toHaveClass('text-amber')
  })

  it('falls back to a neutral badge for an unrecognized condition', () => {
    renderCard({ lot: { ...LOT, condition: 'Brand New' } })

    expect(screen.getByText('Brand New')).toHaveClass('text-slate-gray')
  })

  it('hides Import/Remove actions for a read-only role', () => {
    renderCard({ canWrite: false })

    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Remove/)).not.toBeInTheDocument()
  })

  it('shows an Import button when no import has been attempted', () => {
    renderCard()

    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('shows a queued/processing spinner state', () => {
    renderCard({ lotImport: { status: 'processing' } as ImportSummary })

    expect(screen.getByText('Importing…')).toBeInTheDocument()
  })

  it('shows an "Imported" link to the manifest detail page once completed', () => {
    renderCard({ lotImport: { id: 'import-1', status: 'completed' } as ImportSummary })

    const link = screen.getByRole('link', { name: 'Imported' })
    expect(link).toHaveAttribute('href', '/manifests/import-1')
  })

  it('shows a "Try again" button and failure note when a prior import failed', () => {
    renderCard({ lotImport: { status: 'failed' } as ImportSummary })

    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByText('Import failed')).toBeInTheDocument()
  })

  it('shows an em dash instead of an Import button when there is no manifestUrl', () => {
    renderCard({ lot: { ...LOT, manifestUrl: null } })

    expect(screen.queryByRole('button', { name: 'Import' })).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('calls onDismiss with the lot when Remove is clicked', () => {
    const onDismiss = vi.fn()
    renderCard({ onDismiss })

    screen.getByLabelText('Remove Bosch cordless tool set').click()

    expect(onDismiss).toHaveBeenCalledWith(LOT)
  })
})

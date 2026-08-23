import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SaleabilityPanel } from './SaleabilityPanel'
import type { SaleabilityResult } from '../types/itemScan'

const SALEABILITY: SaleabilityResult = {
  score: 0.72,
  factors: [
    {
      label: 'Sell-through rate not available yet',
      direction: 'neutral',
      explanation: 'Needs real sold-comps data.',
    },
    { label: 'Tightly clustered comp prices', direction: 'up', explanation: null },
    { label: '3 active competing listing(s)', direction: 'up', explanation: null },
  ],
}

describe('SaleabilityPanel', () => {
  it('shows the score as a rounded percentage-style number', () => {
    render(<SaleabilityPanel saleability={SALEABILITY} />)

    expect(screen.getByText('72')).toBeInTheDocument()
    expect(screen.getByText('Saleability score')).toBeInTheDocument()
  })

  it('rounds the score correctly', () => {
    render(<SaleabilityPanel saleability={{ ...SALEABILITY, score: 0.005 }} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders every factor with its explanation', () => {
    render(<SaleabilityPanel saleability={SALEABILITY} />)

    expect(screen.getByText('Sell-through rate not available yet')).toBeInTheDocument()
    expect(screen.getByText('Needs real sold-comps data.')).toBeInTheDocument()
    expect(screen.getByText('Tightly clustered comp prices')).toBeInTheDocument()
    expect(screen.getByText('3 active competing listing(s)')).toBeInTheDocument()
  })
})

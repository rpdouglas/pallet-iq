import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LotProfitabilityPanel } from './LotProfitabilityPanel'
import type { LotProfitabilityResult } from '../types/manifest'

const PROFITABILITY: LotProfitabilityResult = {
  totalLandedCost: 400,
  projectedResaleValue: 600,
  projectedProfit: 200,
  marginPct: 0.5,
  skusResearched: 3,
  skusTotal: 3,
  factors: [
    { label: 'All 3 distinct items researched', direction: 'neutral', explanation: null },
    {
      label: 'Condition not independently verified',
      direction: 'neutral',
      explanation: 'Manifest data does not grade condition.',
    },
  ],
}

describe('LotProfitabilityPanel', () => {
  it('shows the margin as a rounded percentage', () => {
    render(<LotProfitabilityPanel profitability={PROFITABILITY} />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Projected margin')).toBeInTheDocument()
  })

  it('shows an em dash when margin is null (no landed cost to divide by)', () => {
    render(<LotProfitabilityPanel profitability={{ ...PROFITABILITY, marginPct: null }} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows projected profit and landed cost', () => {
    render(<LotProfitabilityPanel profitability={PROFITABILITY} />)

    expect(
      screen.getByText(/\$200\.00 projected profit on \$400\.00 landed cost/),
    ).toBeInTheDocument()
  })

  it('renders every factor', () => {
    render(<LotProfitabilityPanel profitability={PROFITABILITY} />)

    expect(screen.getByText('All 3 distinct items researched')).toBeInTheDocument()
    expect(screen.getByText('Condition not independently verified')).toBeInTheDocument()
    expect(screen.getByText('Manifest data does not grade condition.')).toBeInTheDocument()
  })
})

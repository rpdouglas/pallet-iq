import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PricingPanel } from './PricingPanel'
import type { PricingResult } from '../types/itemScan'

const BASE_PRICING: PricingResult = {
  msrp: 100,
  salePrice: 70,
  salePriceLow: 60,
  salePriceHigh: 80,
  liquidationPrice: 30,
  confidence: 0.7,
  sampleSize: 5,
  factors: [
    {
      label: 'Recommended price rationale',
      direction: 'neutral',
      explanation: 'Anchored on eBay sold comps.',
    },
    { label: 'No retail price found', direction: 'down', explanation: null },
  ],
  comps: [],
  waterfallStepsUsed: ['ebay_sold'],
}

describe('PricingPanel', () => {
  it('shows the sale price headline and confidence', () => {
    render(<PricingPanel pricing={BASE_PRICING} />)

    expect(screen.getByText('$70.00')).toBeInTheDocument()
    expect(screen.getByText('70% confidence')).toBeInTheDocument()
  })

  it('shows msrp, sale range, and liquidation price', () => {
    render(<PricingPanel pricing={BASE_PRICING} />)

    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$60.00–$80.00')).toBeInTheDocument()
    expect(screen.getByText('$30.00')).toBeInTheDocument()
  })

  it('renders every factor with its explanation', () => {
    render(<PricingPanel pricing={BASE_PRICING} />)

    expect(screen.getByText('Recommended price rationale')).toBeInTheDocument()
    expect(screen.getByText('Anchored on eBay sold comps.')).toBeInTheDocument()
    expect(screen.getByText('No retail price found')).toBeInTheDocument()
  })

  it('shows a dash for null price fields', () => {
    render(
      <PricingPanel
        pricing={{
          ...BASE_PRICING,
          msrp: null,
          salePriceLow: null,
          salePriceHigh: null,
          liquidationPrice: null,
        }}
      />,
    )

    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render a comps panel when there are no comps', () => {
    render(<PricingPanel pricing={BASE_PRICING} />)

    expect(screen.queryByText(/comp\(s\) found/i)).not.toBeInTheDocument()
  })

  it('groups comps by source and labels each group honestly', () => {
    render(
      <PricingPanel
        pricing={{
          ...BASE_PRICING,
          comps: [
            {
              title: 'Instant Pot sold #1',
              price: 79.99,
              url: 'https://ebay.ca/1',
              source: 'ebay_sold',
            },
            {
              title: 'Instant Pot Kijiji new',
              price: 90,
              url: 'https://kijiji.ca/1',
              source: 'kijiji_new',
            },
            {
              title: 'Instant Pot Kijiji used',
              price: 54.5,
              url: null,
              source: 'kijiji_used',
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('eBay sold')).toBeInTheDocument()
    expect(screen.getByText('Kijiji – new/sealed')).toBeInTheDocument()
    expect(screen.getByText('Kijiji – used')).toBeInTheDocument()
    expect(screen.getByText('Real sold/completed prices.', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText('Asking prices, not sold data.', { exact: false })).toHaveLength(2)
    expect(screen.getByText('Instant Pot sold #1')).toBeInTheDocument()
    expect(screen.getByText('$79.99')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view instant pot sold #1/i })).toHaveAttribute(
      'href',
      'https://ebay.ca/1',
    )
  })

  it('falls back to a generic "Comps" label for a comp with no source tag', () => {
    render(
      <PricingPanel
        pricing={{
          ...BASE_PRICING,
          comps: [{ title: 'Legacy cached comp', price: 42, url: null }],
        }}
      />,
    )

    expect(screen.getByText('Comps')).toBeInTheDocument()
    expect(screen.getByText('Legacy cached comp')).toBeInTheDocument()
  })
})

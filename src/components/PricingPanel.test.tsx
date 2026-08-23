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
      label: '5 active eBay listing(s) found',
      direction: 'neutral',
      explanation: 'Active asking prices.',
    },
    { label: 'No barcode - vision identification only', direction: 'down', explanation: null },
  ],
  comps: [],
  waterfallStepsUsed: ['ebay'],
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

    expect(screen.getByText('5 active eBay listing(s) found')).toBeInTheDocument()
    expect(screen.getByText('Active asking prices.')).toBeInTheDocument()
    expect(screen.getByText('No barcode - vision identification only')).toBeInTheDocument()
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

    expect(screen.queryByText(/active listings/i)).not.toBeInTheDocument()
  })

  it('renders comps honestly labeled as active listings, not sold data', () => {
    render(
      <PricingPanel
        pricing={{
          ...BASE_PRICING,
          comps: [
            { title: 'Instant Pot Duo 6-Quart', price: 79.99, url: 'https://ebay.com/1' },
            { title: 'Instant Pot Duo 6-Quart Used', price: 54.5, url: null },
          ],
        }}
      />,
    )

    expect(screen.getByText('Active listings (calibrated estimate)')).toBeInTheDocument()
    expect(screen.getByText('Instant Pot Duo 6-Quart')).toBeInTheDocument()
    expect(screen.getByText('$79.99')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /view instant pot duo 6-quart on ebay/i }),
    ).toHaveAttribute('href', 'https://ebay.com/1')
    expect(screen.queryByText(/sold price|sold for/i)).not.toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandMark } from './BrandMark'

describe('BrandMark', () => {
  it('renders the wordmark as a heading by default', () => {
    render(<BrandMark />)

    expect(screen.getByRole('heading', { name: 'PalletIQ' })).toBeInTheDocument()
  })

  it('renders the wordmark as a span, not a heading, when asHeading is false', () => {
    render(<BrandMark asHeading={false} />)

    expect(screen.queryByRole('heading', { name: 'PalletIQ' })).not.toBeInTheDocument()
    expect(screen.getByText('PalletIQ')).toBeInTheDocument()
  })

  it('does not show the tagline by default', () => {
    render(<BrandMark />)

    expect(screen.queryByText(/smarter buys/i)).not.toBeInTheDocument()
  })

  it('shows the tagline when requested', () => {
    render(<BrandMark tagline />)

    expect(screen.getByText(/smarter buys\. higher profits\./i)).toBeInTheDocument()
  })

  it('renders the brand icon', () => {
    render(<BrandMark />)

    expect(screen.getAllByRole('presentation').length).toBeGreaterThan(0)
  })
})

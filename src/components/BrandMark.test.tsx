import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandMark } from './BrandMark'

describe('BrandMark', () => {
  it('renders the wordmark as a span, not a heading', () => {
    render(<BrandMark />)

    expect(screen.queryByRole('heading', { name: 'PalletIQ' })).not.toBeInTheDocument()
    expect(screen.getByText('PalletIQ')).toBeInTheDocument()
  })

  it('renders the brand icon', () => {
    render(<BrandMark />)

    expect(screen.getAllByRole('presentation').length).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthCard } from './AuthCard'

describe('AuthCard', () => {
  it('renders the brand lockup image', () => {
    render(
      <AuthCard>
        <div>Form content</div>
      </AuthCard>,
    )

    expect(
      screen.getByRole('img', { name: 'PalletIQ - Smarter Buys. Higher Profits.' }),
    ).toBeInTheDocument()
  })

  it('renders its children', () => {
    render(
      <AuthCard>
        <div>Form content</div>
      </AuthCard>,
    )

    expect(screen.getByText('Form content')).toBeInTheDocument()
  })
})

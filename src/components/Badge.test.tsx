import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('defaults to the neutral slate tone', () => {
    render(<Badge>Furniture</Badge>)

    expect(screen.getByText('Furniture')).toHaveClass('text-slate-gray')
  })

  it.each([
    ['amber', 'text-amber'],
    ['emerald', 'text-emerald'],
    ['sky', 'text-sky'],
  ] as const)('renders the %s tone with its token class', (tone, expectedClass) => {
    render(<Badge tone={tone}>Returns</Badge>)

    expect(screen.getByText('Returns')).toHaveClass(expectedClass)
  })
})

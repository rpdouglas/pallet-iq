import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('renders an accessible status indicator', () => {
    render(<Spinner />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('accepts a className for sizing', () => {
    render(<Spinner className="h-4 w-4" />)

    expect(screen.getByRole('status')).toHaveClass('h-4', 'w-4', 'animate-spin')
  })
})

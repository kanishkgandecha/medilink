import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PageLayout from './PageLayout'

describe('PageLayout', () => {
  it('does not reserve an empty desktop column without a left panel', () => {
    const { container } = render(<PageLayout><main>Full-width content</main></PageLayout>)
    expect(screen.getByText('Full-width content')).toBeInTheDocument()
    expect(container.querySelector('aside')).toBeNull()
  })

  it('renders the side column when content is provided', () => {
    const { container } = render(<PageLayout leftPanel={<p>Filters</p>}><main>Results</main></PageLayout>)
    expect(container.querySelector('aside')).not.toBeNull()
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })
})

import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import ScopeBadge from './ScopeBadge'

const renderBadge = (props) =>
  render(
    <ThemeProvider>
      <ScopeBadge {...props} />
    </ThemeProvider>
  )

describe('ScopeBadge', () => {
  it('renders the given scope label', () => {
    renderBadge({ label: 'My record', tone: 'self' })
    expect(screen.getByText('My record')).toBeInTheDocument()
  })

  it('renders nothing when no label is given', () => {
    const { container } = renderBadge({ label: '' })
    expect(container).toBeEmptyDOMElement()
  })

  it('falls back to the "all" tone for an unrecognized tone value', () => {
    renderBadge({ label: 'All patients', tone: 'not-a-real-tone' })
    expect(screen.getByText('All patients')).toBeInTheDocument()
  })
})

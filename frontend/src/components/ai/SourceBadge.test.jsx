import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import SourceBadge from './SourceBadge'
import { SOURCE_TYPES } from '../../config/aiSourceTaxonomy'

const renderBadge = (props) =>
  render(
    <ThemeProvider>
      <SourceBadge {...props} />
    </ThemeProvider>
  )

describe('SourceBadge', () => {
  it('renders the Rules label and never calls it a trained model', () => {
    renderBadge({ sourceType: SOURCE_TYPES.RULES })
    expect(screen.getByText('Rules')).toBeInTheDocument()
    expect(screen.queryByText(/trained model/i)).not.toBeInTheDocument()
  })

  it('renders the LLM label', () => {
    renderBadge({ sourceType: SOURCE_TYPES.LLM })
    expect(screen.getByText('LLM')).toBeInTheDocument()
  })

  it('renders the Degraded Fallback label distinctly', () => {
    renderBadge({ sourceType: SOURCE_TYPES.DEGRADED_FALLBACK })
    expect(screen.getByText('Degraded Fallback')).toBeInTheDocument()
  })

  it('renders Live Records for operational/live data', () => {
    renderBadge({ sourceType: SOURCE_TYPES.LIVE_RECORDS })
    expect(screen.getByText('Live Records')).toBeInTheDocument()
  })

  it('derives its source type from a raw result object when no explicit sourceType is given', () => {
    renderBadge({ result: { _source: 'llm' } })
    expect(screen.getByText('LLM')).toBeInTheDocument()
  })

  it('carries an accessible title explaining the source', () => {
    renderBadge({ sourceType: SOURCE_TYPES.RULES })
    expect(screen.getByTitle(/deterministic/i)).toBeInTheDocument()
  })
})

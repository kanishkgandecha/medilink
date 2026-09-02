import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import SourceDisclosure from './SourceDisclosure'
import { SOURCE_TYPES } from '../../config/aiSourceTaxonomy'

const renderDisclosure = (result, props = {}) =>
  render(
    <ThemeProvider>
      <SourceDisclosure result={result} {...props} />
    </ThemeProvider>
  )

describe('SourceDisclosure', () => {
  it('renders nothing when no result is given', () => {
    const { container } = renderDisclosure(null)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders no technical provenance when visibility is disabled', () => {
    const { container } = renderDisclosure(
      { sourceType: SOURCE_TYPES.DEGRADED_FALLBACK, providerUsed: 'OpenRouter' },
      { visible: false },
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('exposes a status role for accessibility', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.RULES })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows provider and model only for a genuine LLM result', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.LLM, providerUsed: 'OpenRouter', modelUsed: 'openai/gpt-4o-mini' })
    expect(screen.getByText(/OpenRouter/)).toBeInTheDocument()
    expect(screen.getByText(/openai\/gpt-4o-mini/)).toBeInTheDocument()
  })

  it('never shows a provider/model for a rules result', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.RULES, providerUsed: 'OpenRouter', modelUsed: 'openai/gpt-4o-mini' })
    expect(screen.queryByText(/OpenRouter/)).not.toBeInTheDocument()
  })

  it('makes a degraded fallback visibly distinct with an explicit fallback notice', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.DEGRADED_FALLBACK })
    expect(screen.getByText('Source: Degraded Fallback')).toBeInTheDocument()
    expect(screen.getByText(/used its safe rules-based fallback/i)).toBeInTheDocument()
  })

  it('supports a concise source-only presentation', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.RULES }, { compact: true })
    expect(screen.getByText(/source: rules/i)).toBeInTheDocument()
    expect(screen.queryByText(/produced by deterministic/i)).not.toBeInTheDocument()
  })

  it('shows a freshness caption using the supplied generatedAt time, never a fabricated one', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.LIVE_RECORDS, generatedAt: '2026-05-09T05:00:00.000Z' })
    expect(screen.getByText(/Retrieved at/)).toBeInTheDocument()
  })

  it('omits freshness rather than guessing when no generatedAt is provided', () => {
    renderDisclosure({ sourceType: SOURCE_TYPES.RECORDS })
    expect(screen.queryByText(/Retrieved at/)).not.toBeInTheDocument()
  })
})

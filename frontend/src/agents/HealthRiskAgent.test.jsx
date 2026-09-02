import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../context/ThemeContext'
import HealthRiskAgent from './HealthRiskAgent'
import { assessHealthRisk } from '../services/aiService'

vi.mock('../services/aiService', () => ({
  assessHealthRisk: vi.fn(),
}))

const renderAgent = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <HealthRiskAgent open onClose={() => {}} />
      </ThemeProvider>
    </MemoryRouter>
  )

// Drives the wizard from step 0 (age) through to the result screen.
const runToResult = async () => {
  fireEvent.change(screen.getByPlaceholderText('e.g., 45'), { target: { value: '50' } })
  fireEvent.click(screen.getByText('Continue'))
  fireEvent.click(screen.getByText('Continue'))
  fireEvent.click(screen.getByText('Calculate Risk'))
  await waitFor(() => expect(screen.getByText('Risk Level')).toBeInTheDocument())
}

describe('HealthRiskAgent — full AI-result presentation flow', () => {
  it('presents a rules-based result honestly: no trained-model claim, source shown, human-review notice present', async () => {
    assessHealthRisk.mockResolvedValueOnce({
      data: {
        riskScore: 35, riskFactors: ['Age 50+'], lifestyle: [], urgentActions: [],
        scoringMethod: 'deterministic', scoringFormula: 'age + conditions + symptoms',
        sourceType: 'rules', sourceLabel: 'Rules',
        sourceExplanation: 'Produced by deterministic clinical or operational rules.',
        generatedAt: new Date().toISOString(),
        providerUsed: null, modelUsed: null, fallbackUsed: false,
        requiresHumanReview: true,
        limitations: ['This is a deterministic screening score, not a diagnosis or a trained predictive model.'],
      },
    })

    renderAgent()
    await runToResult()

    // Source is disclosed and accurately labelled — never "trained model".
    expect(screen.getByText('Source: Rules')).toBeInTheDocument()
    expect(screen.queryByText(/^Source: LLM$/)).not.toBeInTheDocument()
    // No provider/model shown for a rules-only result.
    expect(screen.queryByText(/OpenRouter/)).not.toBeInTheDocument()
    // Human-review / limitation disclosure is present.
    expect(screen.getByText(/must be reviewed by an appropriate healthcare professional/i)).toBeInTheDocument()
    expect(screen.getByText(/not a diagnosis or a trained predictive model/i)).toBeInTheDocument()
  })

  it('falls back to a visibly-degraded local result when the server is unreachable, without fabricating a provider', async () => {
    assessHealthRisk.mockRejectedValueOnce(new Error('network error'))

    renderAgent()
    await runToResult()

    expect(screen.getByText('Source: Degraded Fallback')).toBeInTheDocument()
    expect(screen.getByText(/could not be reached/i)).toBeInTheDocument()
    expect(screen.queryByText(/OpenRouter/)).not.toBeInTheDocument()
  })
})

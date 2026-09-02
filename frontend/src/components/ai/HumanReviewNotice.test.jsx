import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import HumanReviewNotice from './HumanReviewNotice'

const renderNotice = (props) =>
  render(
    <ThemeProvider>
      <HumanReviewNotice {...props} />
    </ThemeProvider>
  )

describe('HumanReviewNotice', () => {
  it('shows the clinical human-review warning by default', () => {
    renderNotice({ context: 'clinical' })
    expect(screen.getByText(/must be reviewed by an appropriate healthcare professional/i)).toBeInTheDocument()
  })

  it('shows the operational recommendation-only language and never implies an automatic action', () => {
    renderNotice({ context: 'operational' })
    expect(screen.getByText(/recommendation only/i)).toBeInTheDocument()
    expect(screen.queryByText(/has been (assigned|booked|reserved)/i)).not.toBeInTheDocument()
  })

  it('omits the review sentence when requiresHumanReview is false', () => {
    renderNotice({ context: 'assistant', requiresHumanReview: false })
    expect(screen.getByText(/General guidance only/i)).toBeInTheDocument()
  })

  it('renders backend-supplied limitations as a list', () => {
    renderNotice({ context: 'clinical', limitations: ['Limitation one', 'Limitation two'] })
    expect(screen.getByText('Limitation one')).toBeInTheDocument()
    expect(screen.getByText('Limitation two')).toBeInTheDocument()
  })

  it('shows an emergency note only when explicitly requested', () => {
    const { rerender } = renderNotice({ context: 'clinical', showEmergencyNote: false })
    expect(screen.queryByText(/call emergency services/i)).not.toBeInTheDocument()
    rerender(
      <ThemeProvider>
        <HumanReviewNotice context="clinical" showEmergencyNote />
      </ThemeProvider>
    )
    expect(screen.getByText(/call emergency services/i)).toBeInTheDocument()
  })
})

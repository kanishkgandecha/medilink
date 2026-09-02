import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import ErrorState from './ErrorState'

const renderError = (props) =>
  render(
    <ThemeProvider>
      <ErrorState {...props} />
    </ThemeProvider>
  )

describe('ErrorState', () => {
  it('offers a Retry action for a generic request failure', () => {
    const onRetry = vi.fn()
    renderError({ variant: 'error', message: 'Network error', onRetry })
    const retryButton = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not offer Retry for an access-denied (403) result, since retrying cannot change the outcome', () => {
    renderError({ variant: 'denied', message: 'You do not have access to this resource', onRetry: vi.fn() })
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    expect(screen.getByText(/don.t have access/i)).toBeInTheDocument()
  })
})

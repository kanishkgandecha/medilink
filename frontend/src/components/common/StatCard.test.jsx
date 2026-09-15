import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import StatCard from './StatCard'
import { Users } from 'lucide-react'

const renderStat = (props) =>
  render(
    <ThemeProvider>
      <StatCard title="Total Patients" value="42" icon={Users} {...props} />
    </ThemeProvider>
  )

describe('StatCard keyboard accessibility', () => {
  it('is not exposed as a button when it has no onClick', () => {
    renderStat()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('exposes an interactive stat card as a focusable button with an accessible name', () => {
    renderStat({ onClick: vi.fn() })
    const card = screen.getByRole('button', { name: 'Total Patients: 42' })
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  it('activates onClick on Enter and Space, not on other keys', () => {
    const onClick = vi.fn()
    renderStat({ onClick })
    const card = screen.getByRole('button', { name: 'Total Patients: 42' })

    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(card, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(card, { key: 'a' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})

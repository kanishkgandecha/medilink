import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../context/ThemeContext'
import { AuthProvider } from '../../context/AuthContext'
import TopNav from './TopNav'

// TopNav's notification panel is 100% static/hardcoded content (there is no
// notification backend) — Phase 5 requires it to be clearly labelled as
// demo/example content rather than presented as live activity.
const renderTopNav = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <TopNav />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  )

describe('TopNav notifications', () => {
  it('labels the static notification panel as demo content', () => {
    renderTopNav()
    fireEvent.click(screen.getByTitle('Notifications'))
    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(screen.getByText(/not generated from live system events/i)).toBeInTheDocument()
  })
})

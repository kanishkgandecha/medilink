import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import Modal from './components/common/Modal'
import ConfirmDialog from './components/common/ConfirmDialog'
import CardPagination, { CARDS_PER_PAGE } from './components/common/CardPagination'
import ErrorState from './components/common/ErrorState'
import StatCard from './components/common/StatCard'
import ScopeBadge from './components/common/ScopeBadge'
import Loader from './components/common/Loader'
import TopNav from './components/common/TopNav'
import BottomNav from './components/common/BottomNav'
import { Users } from 'lucide-react'

// jsdom cannot evaluate real layout/paint, so rules that depend on it
// (color-contrast chief among them) are disabled here; every other axe-core
// rule — landmark, name/role/value, aria-*, label, and structural checks —
// still runs against the rendered DOM.
const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } }

const withProviders = (ui) => (
  <MemoryRouter>
    <ThemeProvider>
      <AuthProvider>{ui}</AuthProvider>
    </ThemeProvider>
  </MemoryRouter>
)

describe('automated accessibility audit (axe-core)', () => {
  it('Modal has no violations while open', async () => {
    const { container } = render(withProviders(
      <Modal isOpen title="Book appointment" onClose={vi.fn()}>
        <p>Dialog content</p>
      </Modal>
    ))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('ConfirmDialog has no violations while open', async () => {
    const { container } = render(withProviders(
      <ConfirmDialog isOpen title="Delete record?" message="This cannot be undone." onClose={vi.fn()} onConfirm={vi.fn()} />
    ))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('CardPagination has no violations', async () => {
    const { container } = render(withProviders(
      <CardPagination total={CARDS_PER_PAGE * 4} page={2} onPage={vi.fn()} />
    ))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('ErrorState has no violations for both variants', async () => {
    const { container } = render(withProviders(
      <>
        <ErrorState variant="error" message="Network request failed" onRetry={vi.fn()} />
        <ErrorState variant="denied" message="You don't have access" />
      </>
    ))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('StatCard has no violations, interactive or static', async () => {
    const { container } = render(withProviders(
      <>
        <StatCard title="Total Patients" value="128" icon={Users} onClick={vi.fn()} />
        <StatCard title="Active Beds" value="12" icon={Users} />
      </>
    ))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('ScopeBadge and Loader have no violations', async () => {
    const { container } = render(withProviders(
      <>
        <ScopeBadge label="Assigned patients" tone="assigned" />
        <Loader />
      </>
    ))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('TopNav has no violations in its default (logged-out) state', async () => {
    const { container } = render(withProviders(<TopNav />))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })

  it('BottomNav has no violations in its default (logged-out) state', async () => {
    const { container } = render(withProviders(<BottomNav />))
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations()
  })
})

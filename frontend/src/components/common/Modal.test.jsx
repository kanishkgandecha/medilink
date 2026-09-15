import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import Modal from './Modal'

const renderModal = (props) =>
  render(
    <ThemeProvider>
      <button type="button">Open trigger</button>
      <Modal isOpen title="Test dialog" onClose={vi.fn()} {...props}>
        <button type="button">First field action</button>
        <button type="button">Last field action</button>
      </Modal>
    </ThemeProvider>
  )

describe('Modal accessibility', () => {
  it('exposes dialog semantics with a labelled title', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Test dialog')
  })

  it('gives the close button an accessible name', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ThemeProvider>
        <Modal isOpen={false} title="Hidden" onClose={vi.fn()}>content</Modal>
      </ThemeProvider>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop overlay is clicked, not the panel', () => {
    const onClose = vi.fn()
    renderModal({ onClose })
    // Modal renders via a portal into document.body, not the RTL container.
    const overlay = document.querySelector('.fixed.inset-0 > .absolute.inset-0')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves initial focus inside the dialog on open', () => {
    renderModal()
    // The trigger button rendered outside the modal must not retain focus.
    expect(screen.getByText('Open trigger')).not.toHaveFocus()
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()
  })

  it('traps Tab focus between the first and last focusable elements', () => {
    renderModal()
    const closeBtn  = screen.getByRole('button', { name: 'Close dialog' })
    const lastField = screen.getByText('Last field action')

    lastField.focus()
    fireEvent.keyDown(lastField, { key: 'Tab' })
    expect(closeBtn).toHaveFocus()

    fireEvent.keyDown(closeBtn, { key: 'Tab', shiftKey: true })
    expect(lastField).toHaveFocus()
  })

  it('returns focus to the triggering element after closing', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'External trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(trigger).toHaveFocus()

    const { rerender } = render(
      <ThemeProvider>
        <Modal isOpen title="Test dialog" onClose={vi.fn()}>content</Modal>
      </ThemeProvider>
    )
    expect(trigger).not.toHaveFocus()

    rerender(
      <ThemeProvider>
        <Modal isOpen={false} title="Test dialog" onClose={vi.fn()}>content</Modal>
      </ThemeProvider>
    )
    expect(trigger).toHaveFocus()
    document.body.removeChild(trigger)
  })
})

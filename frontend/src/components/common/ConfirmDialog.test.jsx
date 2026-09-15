import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../context/ThemeContext'
import ConfirmDialog from './ConfirmDialog'

const renderDialog = (props) =>
  render(
    <ThemeProvider>
      <ConfirmDialog
        isOpen
        title="Delete patient record?"
        message="This action cannot be undone."
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        {...props}
      />
    </ThemeProvider>
  )

describe('ConfirmDialog accessibility', () => {
  it('exposes dialog semantics linked to its title and message', () => {
    renderDialog()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Delete patient record?')
    expect(dialog).toHaveAccessibleDescription('This action cannot be undone.')
  })

  it('gives the close icon button an accessible name', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls both onConfirm and onClose when the confirm action is clicked', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderDialog({ onConfirm, onClose, confirmLabel: 'Delete' })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ThemeProvider>
        <ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />
      </ThemeProvider>
    )
    expect(container).toBeEmptyDOMElement()
  })
})

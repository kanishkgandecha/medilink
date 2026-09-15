import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Shared dialog/modal accessibility behavior: Escape-to-close, a focus trap
 * that cycles Tab/Shift+Tab within the dialog, initial focus on open, and
 * returning focus to the element that triggered the dialog on close.
 *
 * Returns a ref to attach to the dialog panel element.
 */
export function useModalA11y(isOpen, onClose) {
  const panelRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    triggerRef.current = document.activeElement

    const panel = panelRef.current
    const focusables = () => panel
      ? Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
      : []

    const initial = focusables()[0]
    if (initial) initial.focus()
    else if (panel) panel.focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const toRestore = triggerRef.current
      if (toRestore && typeof toRestore.focus === 'function') {
        toRestore.focus()
      }
    }
  }, [isOpen, onClose])

  return panelRef
}

export default useModalA11y

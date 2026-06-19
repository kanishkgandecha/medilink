import React, { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const SIZE_MAP = {
  sm:   'max-w-md',
  md:   'max-w-2xl',
  lg:   'max-w-4xl',
  xl:   'max-w-6xl',
  full: 'max-w-full mx-4',
}

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const { darkMode } = useTheme()

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[#2C3E50]/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative w-full ${SIZE_MAP[size] || SIZE_MAP.md}
          max-h-[90vh] flex flex-col
          rounded-2xl overflow-hidden
          animate-scale-in
          border
          ${darkMode
            ? 'bg-gray-800 border-gray-700/60'
            : 'bg-white border-[#E2E8F0]'}`}
        style={{
          boxShadow: darkMode
            ? '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 24px 60px rgba(44,62,80,0.16), 0 0 0 1px rgba(46,134,222,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0
            ${darkMode
              ? 'border-gray-700/80 bg-gray-800'
              : 'border-gray-100 bg-white'}`}
        >
          <h3 className={`text-base font-semibold leading-tight
            ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>

          <button
            onClick={onClose}
            className={`ml-4 p-2 rounded-lg transition-all duration-200 flex-shrink-0
              ${darkMode
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal

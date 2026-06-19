import React from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  confirmClass = 'bg-red-600 hover:bg-red-700',
  icon: Icon = AlertTriangle,
  iconClass = 'text-red-500',
  children,
}) => {
  const { darkMode } = useTheme()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border animate-scale-in
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <Icon className={`w-5 h-5 ${iconClass}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{message}</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors flex-shrink-0 ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional extra content (e.g. reason textarea) */}
        {children && (
          <div className="px-6 pb-2">{children}</div>
        )}

        {/* Actions */}
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl border text-sm font-medium transition-all
              ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.97] ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

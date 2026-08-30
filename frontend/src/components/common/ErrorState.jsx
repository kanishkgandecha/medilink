import React from 'react'
import { AlertCircle, ShieldAlert, RefreshCw } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// Reusable inline error card for list/detail pages, styled to match the
// existing empty-state cards. Distinguishes an access-denial (403) from a
// generic request failure (network/500/etc.) and only offers Retry for the
// latter — retrying a 403 will not change the outcome.
//
// Usage: derive `variant` from the caught error's response status, e.g.
//   variant={err?.response?.status === 403 ? 'denied' : 'error'}
const ErrorState = ({ message, onRetry, variant = 'error', title, className = '' }) => {
  const { darkMode } = useTheme()
  const isDenied = variant === 'denied'
  const Icon = isDenied ? ShieldAlert : AlertCircle

  const card = darkMode
    ? 'bg-gray-800 border-gray-700/60'
    : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'

  return (
    <div className={`${card} border rounded-xl py-16 px-6 text-center ${className}`}>
      <Icon className={`w-10 h-10 mx-auto mb-3 ${isDenied ? 'text-amber-500' : 'text-red-500'}`} />
      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {title || (isDenied ? 'You don’t have access to this data' : 'Couldn’t load this page')}
      </p>
      {message && (
        <p className={`text-sm mt-1 max-w-sm mx-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {message}
        </p>
      )}
      {onRetry && !isDenied && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2E86DE] hover:bg-[#1a6db5] text-white text-sm font-semibold transition-all active:scale-[0.97]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      )}
    </div>
  )
}

export default ErrorState

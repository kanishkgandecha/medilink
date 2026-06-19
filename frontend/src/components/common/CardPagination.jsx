import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export const CARDS_PER_PAGE = 12

// Returns the slice of `data` for the current page
export const paginateData = (data, page) => {
  const first = (page - 1) * CARDS_PER_PAGE
  return data.slice(first, first + CARDS_PER_PAGE)
}

const CardPagination = ({ total, page, onPage }) => {
  const { darkMode } = useTheme()
  const totalPages = Math.ceil(total / CARDS_PER_PAGE)
  if (totalPages <= 1) return null

  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)
  })()

  const btn = (disabled, onClick, children, active = false) => (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-150
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${active
          ? 'bg-[#2E86DE] text-white shadow-[0_2px_8px_rgba(46,134,222,0.35)]'
          : darkMode
            ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
            : 'text-gray-500 hover:bg-[#EBF5FB] hover:text-[#2E86DE]'}`}
    >
      {children}
    </button>
  )

  const first = (page - 1) * CARDS_PER_PAGE + 1
  const last  = Math.min(page * CARDS_PER_PAGE, total)

  return (
    <div className={`flex items-center justify-between px-2 py-3 rounded-xl border
      ${darkMode ? 'bg-gray-800 border-gray-700/60' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]'}`}>
      <p className={`text-xs font-medium tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-1">
        {btn(page === 1, () => onPage(page - 1), <ChevronLeft className="w-4 h-4" />)}
        {pageNums.map(p => btn(false, () => onPage(p), p, p === page))}
        {btn(page === totalPages, () => onPage(page + 1), <ChevronRight className="w-4 h-4" />)}
      </div>
    </div>
  )
}

export default CardPagination

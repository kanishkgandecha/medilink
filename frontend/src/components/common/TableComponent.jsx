import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const PAGE_SIZE = 10

const TableComponent = ({
  columns,
  data,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search…',
  actions,
  emptyIcon,
  emptyText = 'No records found',
}) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage]             = useState(1)

  const getLeafStrings = (val, depth = 2) => {
    if (depth === 0 || val === null || val === undefined) return [String(val ?? '')]
    if (typeof val === 'object' && !Array.isArray(val)) {
      return Object.values(val).flatMap(v => getLeafStrings(v, depth - 1))
    }
    if (Array.isArray(val)) return val.flatMap(v => getLeafStrings(v, depth - 1))
    return [String(val)]
  }

  const filteredData = searchable
    ? data.filter(row =>
        getLeafStrings(row).some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : data

  const totalPages   = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
  const clampedPage  = Math.min(page, totalPages)
  const paginatedData = filteredData.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchTerm, data])

  const pageNums = (() => {
    const total = totalPages
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    const start = Math.max(1, Math.min(clampedPage - 2, total - 4))
    return Array.from({ length: 5 }, (_, i) => start + i)
  })()

  return (
    <div className={`rounded-[12px] border overflow-hidden
      ${darkMode
        ? 'bg-gray-800 border-gray-700/60 shadow-[0_2px_8px_rgba(0,0,0,0.2)]'
        : 'bg-white border-[#E2E8F0] shadow-[0_2px_8px_rgba(44,62,80,0.07),0_1px_2px_rgba(0,0,0,0.04)]'}`}
    >

      {/* ── Toolbar ──────────────────────────────────────── */}
      {(searchable || actions) && (
        <div className={`flex items-center gap-3 px-5 py-3.5 border-b
          ${darkMode ? 'border-gray-700/60 bg-gray-800' : 'border-[#E2E8F0] bg-[#F5F7FA]'}`}>

          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B8A8B] pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full pl-9 pr-8 py-2 text-sm rounded-xl border transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-[#2E86DE]/30 focus:border-[#2E86DE]
                  ${darkMode
                    ? 'bg-gray-700/70 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-[#E2E8F0] text-[#2C3E50] placeholder-[#7B8A8B] hover:border-[#5DADE2]/50'}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2C3E50] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}

          {searchable && !actions && (
            <p className={`ml-auto text-xs tabular-nums font-medium
              ${darkMode ? 'text-gray-500' : 'text-[#7B8A8B]'}`}>
              {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full">

          {/* Header */}
          <thead>
            <tr className={`border-b
              ${darkMode
                ? 'bg-gray-800/90 border-gray-700/60'
                : 'bg-[#F5F7FA] border-[#E2E8F0]'}`}>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider
                    ${darkMode ? 'text-gray-400' : 'text-[#7B8A8B]'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    {emptyIcon && (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center
                        ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        {React.createElement(emptyIcon, {
                          className: `w-6 h-6 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`,
                          strokeWidth: 1.5
                        })}
                      </div>
                    )}
                    <div className="text-center">
                      <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {emptyText}
                      </p>
                      <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row._id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    border-b transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${darkMode
                      ? 'border-gray-700/40 hover:bg-[#2E86DE]/5'
                      : 'border-gray-100 hover:bg-blue-50/40'}
                  `}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-5 py-4 text-sm
                        ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-5 py-3 border-t
          ${darkMode ? 'border-gray-700/60 bg-gray-800' : 'border-[#E2E8F0] bg-[#F5F7FA]'}`}>

          <p className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-[#7B8A8B]'}`}>
            {(clampedPage - 1) * PAGE_SIZE + 1}–{Math.min(clampedPage * PAGE_SIZE, filteredData.length)} of {filteredData.length}
          </p>

          <div className="flex items-center gap-1">
            <PagBtn
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={clampedPage === 1}
              darkMode={darkMode}
            >
              <ChevronLeft className="w-4 h-4" />
            </PagBtn>

            {pageNums.map(p => (
              <PagBtn
                key={p}
                onClick={() => setPage(p)}
                active={p === clampedPage}
                darkMode={darkMode}
              >
                {p}
              </PagBtn>
            ))}

            <PagBtn
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={clampedPage === totalPages}
              darkMode={darkMode}
            >
              <ChevronRight className="w-4 h-4" />
            </PagBtn>
          </div>
        </div>
      )}
    </div>
  )
}

const PagBtn = ({ children, onClick, disabled, active, darkMode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold
      transition-all duration-150 flex items-center justify-center
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      ${active
        ? 'bg-[#2E86DE] text-white shadow-[0_2px_8px_rgba(46,134,222,0.35)]'
        : darkMode
          ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
          : 'text-[#7B8A8B] hover:bg-[#EBF5FB] hover:text-[#2E86DE]'}`}
  >
    {children}
  </button>
)

export default TableComponent

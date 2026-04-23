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
  actions,        // optional: <ReactNode> rendered right of search bar
  emptyIcon,      // optional: icon component to show in empty state
  emptyText = 'No records found',
}) => {
  const { darkMode } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

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
        getLeafStrings(row).some(value =>
          value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
  const clampedPage = Math.min(page, totalPages)
  const paginatedData = filteredData.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchTerm, data])

  const border = darkMode ? 'border-gray-700/70' : 'border-gray-100'
  const bg     = darkMode ? 'bg-gray-800' : 'bg-white'

  // Page number window
  const pageNums = (() => {
    const total = totalPages
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    const start = Math.max(1, Math.min(clampedPage - 2, total - 4))
    return Array.from({ length: 5 }, (_, i) => start + i)
  })()

  return (
    <div className={`${bg} rounded-2xl border ${border} overflow-hidden`}>

      {/* ── Toolbar ────────────────────────────────────── */}
      {(searchable || actions) && (
        <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${border}`}>
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full pl-9 pr-8 py-2 text-sm rounded-xl border transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
                  ${darkMode
                    ? 'bg-gray-700/70 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 hover:border-gray-300'}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
          {searchable && !actions && (
            <p className={`ml-auto text-xs tabular-nums ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${border} ${darkMode ? 'bg-gray-800/80' : 'bg-gray-50/80'}`}>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider
                    ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className={`divide-y ${border}`}>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    {emptyIcon && (
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
                        ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        {React.createElement(emptyIcon, {
                          className: `w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`,
                          strokeWidth: 1.5
                        })}
                      </div>
                    )}
                    <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => (
                <tr
                  key={row._id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${darkMode
                      ? 'hover:bg-gray-700/50'
                      : 'hover:bg-blue-50/40'}`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-5 py-3.5 text-sm
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

      {/* ── Pagination ─────────────────────────────────── */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between px-5 py-3 border-t ${border}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
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
    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium
      transition-all duration-150 flex items-center justify-center
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      ${active
        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm shadow-blue-500/25'
        : darkMode
          ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
  >
    {children}
  </button>
)

export default TableComponent

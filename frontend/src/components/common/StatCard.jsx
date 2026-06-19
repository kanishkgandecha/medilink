import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// iconBg: Tailwind bg + text classes for the icon box, e.g. 'bg-blue-50 text-blue-600'
const StatCard = ({ title, value, change, icon: Icon, trend, iconBg = 'bg-blue-50 text-[#2E86DE]', onClick }) => {
  const { darkMode } = useTheme()
  const isPositive   = trend === 'up'

  // Derive accent color from iconBg class string
  const accentColor =
    iconBg.includes('teal')    ? '#0d9488' :
    iconBg.includes('emerald') ? '#10b981' :
    iconBg.includes('orange')  ? '#f97316' :
    iconBg.includes('violet')  ? '#7c3aed' :
    iconBg.includes('red')     ? '#ef4444' :
    iconBg.includes('amber')   ? '#f59e0b' :
    iconBg.includes('purple')  ? '#9333ea' :
    '#2E86DE'

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl p-5 border transition-all duration-200 overflow-hidden relative
        ${onClick ? 'cursor-pointer select-none' : ''}
        ${darkMode
          ? `bg-gray-800 border-gray-700/60 hover:border-gray-600 hover:shadow-md ${onClick ? 'hover:bg-gray-750' : ''}`
          : `bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:shadow-md ${onClick ? 'active:scale-[0.98]' : ''}`}
      `}>
      {/* Colored left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accentColor }}
      />

      {/* Top row: label + icon */}
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider
          ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {title}
        </p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${darkMode ? 'bg-gray-700' : iconBg}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <p className={`text-3xl font-bold tabular-nums leading-tight
        ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>

      {/* Trend */}
      {change && (
        <div className="flex items-center mt-2 gap-1.5">
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
            ${isPositive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
          <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>vs last month</span>
        </div>
      )}
    </div>
  )
}

export default StatCard

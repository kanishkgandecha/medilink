import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const StatCard = ({ title, value, change, icon: Icon, trend, color }) => {
  const { darkMode } = useTheme()
  const isPositive = trend === 'up'

  return (
    <div
      className={`relative overflow-hidden border rounded-2xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-default
        ${darkMode ? 'bg-gray-800 border-gray-700/60 shadow-gray-900/40' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/80'}`}
    >
      {/* Subtle background accent */}
      <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full bg-gradient-to-br ${color} opacity-10 blur-xl pointer-events-none`} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {title}
          </p>
          <h3 className={`text-3xl font-bold mt-2 tabular-nums ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </h3>
          {change && (
            <div className="flex items-center mt-3 gap-1.5">
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold
                ${isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change}
              </div>
              <span className="text-xs text-gray-400">vs last month</span>
            </div>
          )}
        </div>

        <div className={`p-3.5 rounded-xl bg-gradient-to-br ${color} shadow-md flex-shrink-0`}>
          <Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
        </div>
      </div>

      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color} opacity-60`} />
    </div>
  )
}

export default StatCard

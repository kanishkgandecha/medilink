import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

/**
 * Smart timestamp badge for MediLink.
 *
 * Props:
 *   date      — Date | string | number  (required)
 *   showTime  — boolean (default true)
 *   showRel   — boolean (default true) — show "2h ago" / "in 3d" badge
 *   compact   — boolean (default false) — single-line inline layout
 *   className — extra classes on the wrapper
 */

function parseDate(d) {
  if (!d) return null
  const parsed = new Date(d)
  return isNaN(parsed.getTime()) ? null : parsed
}

function smartDay(date, now) {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const startOfDate = new Date(date)
  startOfDate.setHours(0, 0, 0, 0)

  const diffDays = Math.round((startOfDate - startOfToday) / 86_400_000)

  if (diffDays === 0)  return 'Today'
  if (diffDays === 1)  return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  if (diffDays > 1 && diffDays <= 6) return DAYS[date.getDay()]
  if (diffDays < -1 && diffDays >= -6) return DAYS[date.getDay()]

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function relativeLabel(date, now) {
  const diffMs = date - now
  const abs    = Math.abs(diffMs)
  const past   = diffMs < 0

  if (abs < 60_000)         return 'Just now'
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000)
    return past ? `${m}m ago` : `in ${m}m`
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000)
    return past ? `${h}h ago` : `in ${h}h`
  }
  if (abs < 86_400_000 * 7) {
    const d = Math.round(abs / 86_400_000)
    return past ? `${d}d ago` : `in ${d}d`
  }
  if (abs < 86_400_000 * 30) {
    const w = Math.round(abs / (86_400_000 * 7))
    return past ? `${w}w ago` : `in ${w}w`
  }
  return null
}

function formatTime(date) {
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

const TimeStamp = ({ date, showTime = true, showRel = true, compact = false, className = '' }) => {
  const { darkMode } = useTheme()
  const [now, setNow] = useState(() => new Date())

  // Refresh relative time every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const parsed = parseDate(date)
  if (!parsed) return null

  const dayLabel  = smartDay(parsed, now)
  const timeStr   = showTime ? formatTime(parsed) : null
  const rel       = showRel  ? relativeLabel(parsed, now) : null

  const isToday    = dayLabel === 'Today'
  const isTomorrow = dayLabel === 'Tomorrow'
  const isPast     = parsed < now

  // Colour the relative badge
  const relColor = isPast
    ? darkMode ? 'text-gray-500' : 'text-gray-400'
    : isToday || isTomorrow
      ? 'text-[#1ABC9C]'
      : 'text-[#2E86DE]'

  const dayColor = isToday
    ? 'text-[#2E86DE] font-semibold'
    : isTomorrow
      ? 'text-[#1ABC9C] font-semibold'
      : darkMode ? 'text-gray-200 font-medium' : 'text-gray-700 font-medium'

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.75} />
        <span className={`text-xs ${dayColor}`}>{dayLabel}</span>
        {timeStr && (
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>• {timeStr}</span>
        )}
        {rel && (
          <span className={`text-[11px] ${relColor}`}>({rel})</span>
        )}
      </span>
    )
  }

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} strokeWidth={1.75} />
        <span className={`text-sm ${dayColor}`}>{dayLabel}</span>
        {timeStr && (
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>• {timeStr}</span>
        )}
      </div>
      {rel && (
        <span className={`text-[11px] pl-5 ${relColor}`}>{rel}</span>
      )}
    </div>
  )
}

export default TimeStamp

import React from 'react'
import { User, Users, Globe, Eye } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// Small pill that tells the user what data scope they're looking at
// (their own record, records assigned to them, everything, or a
// read-only view of everything) before they take any action.
//
// `tone` must match the actual backend scoping for the page — see
// `src/config/pageCapabilities.js`, which is the source of these values.
const TONE_STYLES = {
  self:     { icon: User,  light: 'bg-blue-50 text-blue-700',       dark: 'bg-blue-900/30 text-blue-300' },
  assigned: { icon: Users, light: 'bg-violet-50 text-violet-700',   dark: 'bg-violet-900/30 text-violet-300' },
  all:      { icon: Globe, light: 'bg-emerald-50 text-emerald-700', dark: 'bg-emerald-900/30 text-emerald-300' },
  view:     { icon: Eye,   light: 'bg-amber-50 text-amber-700',     dark: 'bg-amber-900/30 text-amber-300' },
}

const ScopeBadge = ({ label, tone = 'all', className = '' }) => {
  const { darkMode } = useTheme()
  if (!label) return null
  const { icon: Icon, light, dark } = TONE_STYLES[tone] || TONE_STYLES.all

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${darkMode ? dark : light} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

export default ScopeBadge

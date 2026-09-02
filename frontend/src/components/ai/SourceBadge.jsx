import React from 'react'
import { ClipboardList, Database, Activity, Sparkles, ShieldAlert } from 'lucide-react'
import { resolveSourceDisplay, SOURCE_TYPES } from '../../config/aiSourceTaxonomy'
import { useTheme } from '../../context/ThemeContext'

const SOURCE_ICON = {
  [SOURCE_TYPES.RULES]: ClipboardList,
  [SOURCE_TYPES.RECORDS]: Database,
  [SOURCE_TYPES.LIVE_RECORDS]: Activity,
  [SOURCE_TYPES.LLM]: Sparkles,
  [SOURCE_TYPES.DEGRADED_FALLBACK]: ShieldAlert,
}

/**
 * Compact pill version of the source taxonomy for dashboard headers and
 * card corners, where the full SourceDisclosure box would be too heavy.
 * Accepts either a raw agent result/metadata object or an explicit
 * `sourceType` string.
 */
const SourceBadge = ({ result, sourceType, title, className = '' }) => {
  const { darkMode } = useTheme()
  const display = resolveSourceDisplay(sourceType ? { sourceType } : result)
  const Icon = SOURCE_ICON[display.sourceType] || ClipboardList
  const toneCls = darkMode ? display.style.dark : display.style.light

  return (
    <span
      title={title || display.explanation}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${toneCls} ${className}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {display.label}
    </span>
  )
}

export default SourceBadge

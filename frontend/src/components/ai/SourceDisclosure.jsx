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

const formatGeneratedAt = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `Retrieved at ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
}

/**
 * Shared AI-result provenance disclosure. Meaning never depends on color
 * alone: every state renders an icon plus the taxonomy label as text.
 *
 * Accepts the raw agent `result` object (new taxonomy fields or the legacy
 * `_source`/`_degraded`/`_model` shape — see config/aiSourceTaxonomy.js) so
 * every existing call site (`<SourceDisclosure result={result} />`) keeps
 * working unchanged.
 */
const SourceDisclosure = ({ result, compact = false, className = '', visible = true }) => {
  const { darkMode } = useTheme()
  if (!result || !visible) return null
  const display = resolveSourceDisplay(result)
  const Icon = SOURCE_ICON[display.sourceType] || ClipboardList
  const freshness = formatGeneratedAt(display.generatedAt)
  const toneCls = darkMode ? display.style.dark : display.style.light

  return (
    <div
      role="status"
      className={`rounded-lg border px-3 py-2 text-xs ${compact ? '' : 'space-y-1'} ${toneCls} ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="font-semibold">Source: {display.label}</span>
        {display.providerUsed && (
          <span className="opacity-80">
            · {display.providerUsed}{display.modelUsed ? ` (${display.modelUsed})` : ''}
          </span>
        )}
        {freshness && <span className="opacity-70">· {freshness}</span>}
      </div>
      {!compact && <p className="opacity-90">{display.explanation}</p>}
    </div>
  )
}

export default SourceDisclosure

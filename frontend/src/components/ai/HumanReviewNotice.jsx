import React from 'react'
import { Stethoscope, PhoneCall } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// Short, context-appropriate lead sentences so every card isn't filled with
// an identical wall of text. `limitations` (from the backend's source
// metadata — see config/aiSourceTaxonomy.js) is appended as a compact list
// when present.
const CONTEXT_COPY = {
  clinical: 'This is decision support, not a diagnosis. It may be incomplete or incorrect and must be reviewed by an appropriate healthcare professional.',
  operational: 'This is a recommendation only. It has not reserved or assigned anything — an authorized staff member must confirm it.',
  assistant: 'General guidance only. It cannot read or change your medical record.',
}

/**
 * Compact, reusable disclosure for human-review requirements and result
 * limitations. Pass `requiresHumanReview={false}` to omit the review
 * sentence for results that genuinely don't need clinician review (e.g.
 * navigation guidance).
 */
const HumanReviewNotice = ({
  context = 'clinical',
  limitations = [],
  requiresHumanReview = true,
  showEmergencyNote = false,
  className = '',
}) => {
  const { darkMode } = useTheme()
  const lead = CONTEXT_COPY[context] || CONTEXT_COPY.clinical

  return (
    <div className={`text-xs border-t pt-3 space-y-1.5 ${darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-100 text-gray-500'} ${className}`}>
      {requiresHumanReview && (
        <p className="flex items-start gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{lead}</span>
        </p>
      )}
      {!requiresHumanReview && <p>{lead}</p>}
      {limitations.length > 0 && (
        <ul className="pl-5 list-disc space-y-0.5">
          {limitations.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
      {showEmergencyNote && (
        <p className="flex items-start gap-1.5 font-medium">
          <PhoneCall className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>For emergency symptoms, call emergency services (112 in India) instead of relying on this tool.</span>
        </p>
      )}
    </div>
  )
}

export default HumanReviewNotice

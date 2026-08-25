import React from 'react'

const LABELS = {
  llm: 'External AI output — safety rules applied',
  rules: 'Deterministic rules fallback',
  records: 'Generated only from MediLink records',
  'local-rules': 'Local deterministic fallback',
}

const SourceDisclosure = ({ result }) => {
  if (!result) return null
  const source = result._source || (result._degraded ? 'rules' : 'unknown')
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${result._degraded
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300'
      : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300'}`}>
      Source: {LABELS[source] || 'Automated advisory output'}. Not a verified clinical record.
    </div>
  )
}

export default SourceDisclosure

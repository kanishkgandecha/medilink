// Narrowly-scoped, centralized formatters for user-facing values that were
// previously formatted ad hoc (and inconsistently) across pages. These are
// additive/opt-in: existing inline formatting is left alone except where a
// Phase 5 fix specifically required it.

const MISSING = '—'

/** Safe fallback for any value that might be null/undefined/empty. */
export const formatOrDash = (value, dash = MISSING) =>
  value === null || value === undefined || value === '' ? dash : value

/**
 * Turn a raw enum-ish value (SCREAMING_SNAKE_CASE, PascalCaseNoSpace,
 * hyphen-Title-Case, or already-clean text) into readable Title Case with
 * spaces, e.g. "IN_PROGRESS" / "InProgress" / "In-Progress" -> "In Progress".
 * Known medically meaningful abbreviations and symbols (blood groups,
 * "ICU", "OPD", etc.) are preserved via SPECIAL_CASES rather than reflowed.
 */
const SPECIAL_CASES = {
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-', B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-', O_POSITIVE: 'O+', O_NEGATIVE: 'O-',
  ICU: 'ICU', NICU: 'NICU', OPD: 'OPD', ECG: 'ECG', CT: 'CT', MRI: 'MRI', UPI: 'UPI',
}

export const formatEnumLabel = (value) => {
  if (value === null || value === undefined || value === '') return MISSING
  const raw = String(value)
  if (SPECIAL_CASES[raw]) return SPECIAL_CASES[raw]
  if (SPECIAL_CASES[raw.toUpperCase()]) return SPECIAL_CASES[raw.toUpperCase()]
  // Already has separators (spaces/hyphens) and meaningful existing
  // capitalization (e.g. "In-Progress") — just normalize spacing, don't reflow casing.
  if (/[ -]/.test(raw) && /[A-Z]/.test(raw) && /[a-z]/.test(raw)) {
    return raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  }
  // SCREAMING_SNAKE_CASE or kebab-case -> Title Case
  if (/^[A-Z0-9_]+$/.test(raw) || /^[a-z0-9-]+$/.test(raw)) {
    return raw
      .split(/[-_]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  // PascalCase / camelCase with no separators -> split on case boundaries
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(raw) && /[a-z][A-Z]/.test(raw)) {
    return raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim()
  }
  return raw
}

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime())
const toDate = (value) => {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return isValidDate(d) ? d : null
}

/** Null/invalid-safe date formatter. Never renders "Invalid Date". */
export const formatDateSafe = (value, opts = {}) => {
  const d = toDate(value)
  if (!d) return opts.fallback ?? MISSING
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: opts.month || 'short', year: 'numeric', ...opts.dateOptions,
  })
}

/** Null/invalid-safe date+time formatter. */
export const formatDateTimeSafe = (value, opts = {}) => {
  const d = toDate(value)
  if (!d) return opts.fallback ?? MISSING
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    ...opts.dateOptions,
  })
}

/** Null/invalid-safe time-only formatter, e.g. for "Retrieved at 10:42 AM". */
export const formatTimeSafe = (value, opts = {}) => {
  const d = toDate(value)
  if (!d) return opts.fallback ?? MISSING
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', ...opts.dateOptions })
}

/**
 * A short, honest freshness caption for data fetched from the backend.
 * Uses the API response timestamp when given; otherwise the caller should
 * pass the actual client fetch-completion time — never a fabricated one.
 */
export const formatFreshness = (value, { justNowWindowMs = 60_000 } = {}) => {
  const d = toDate(value)
  if (!d) return 'Data unavailable'
  const ageMs = Date.now() - d.getTime()
  if (ageMs >= 0 && ageMs < justNowWindowMs) return 'Updated just now'
  return `Retrieved at ${formatTimeSafe(d)}`
}

/** Indian Rupee currency formatting, deterministic and locale-consistent. */
export const formatINR = (amount, opts = {}) => {
  const n = Number(amount)
  if (!Number.isFinite(n)) return opts.fallback ?? `₹0`
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  }).format(n)
}

/** Locale-aware, deterministic number formatting with a safe fallback. */
export const formatNumber = (value, opts = {}) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return opts.fallback ?? MISSING
  return new Intl.NumberFormat('en-IN', opts).format(n)
}

/** A signed percentage string, e.g. "+12%" / "-4%" / "0%". */
export const formatSignedPercent = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return MISSING
  return `${n > 0 ? '+' : ''}${n}%`
}

export const formatBoolean = (value, { yes = 'Yes', no = 'No', unknown = MISSING } = {}) => {
  if (value === true) return yes
  if (value === false) return no
  return unknown
}

export const formatName = (value, fallback = 'Unknown') => {
  const s = typeof value === 'string' ? value.trim() : ''
  return s || fallback
}

export const getInitials = (name, max = 2) => {
  const s = formatName(name, '')
  if (!s) return ''
  return s.split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, max)
}

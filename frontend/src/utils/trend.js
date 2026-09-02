// Shared comparison/trend logic so dashboards stop inventing "0% change"
// or huge fake percentages when there is no real baseline to compare
// against (see docs/ui-feature-audit-and-remediation-plan.md, Phase 5).
//
// A trend is only ever returned as available when both values exist, are
// finite, share an equivalent time window (the caller's responsibility to
// ensure), and the comparison is mathematically defined (previous !== 0).

/**
 * @param {number|null|undefined} current
 * @param {number|null|undefined} previous
 * @returns {{available:false, reason:'no-data'|'baseline-unavailable'} |
 *           {available:true, pct:number, direction:'up'|'down'|'flat'}}
 */
export function computeTrend(current, previous) {
  const hasCurrent = typeof current === 'number' && Number.isFinite(current)
  const hasPrevious = typeof previous === 'number' && Number.isFinite(previous)

  if (!hasCurrent || !hasPrevious) {
    return { available: false, reason: 'no-data' }
  }
  if (previous === 0) {
    // A change from zero is not a meaningful percentage (division by zero),
    // and a current value of zero next to a real baseline is a real -100%,
    // which IS meaningful — only the zero-baseline case is undefined.
    return { available: false, reason: 'baseline-unavailable' }
  }

  const pct = Math.round(((current - previous) / previous) * 1000) / 10
  return { available: true, pct, direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}

/**
 * Accepts either a precomputed trend object (as returned by an API that
 * already exposes `{ trend, trendAvailable }`, e.g. Admin Insights) or a
 * pair of raw values, and returns one consistent label.
 */
export function formatTrendLabel(trend, { unavailableLabel = 'No comparison data' } = {}) {
  if (!trend || trend.available === false) return unavailableLabel
  const pct = trend.pct
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return unavailableLabel
  return `${pct > 0 ? '+' : ''}${pct}%`
}

/** Convenience wrapper for an API shape of `{ value, previousValue, trend, trendAvailable }`. */
export function trendFromApi({ trend, trendAvailable }) {
  if (!trendAvailable || typeof trend !== 'number' || !Number.isFinite(trend)) {
    return { available: false, reason: 'baseline-unavailable' }
  }
  return { available: true, pct: trend, direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat' }
}

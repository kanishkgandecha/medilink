import { describe, it, expect } from 'vitest'
import { computeTrend, formatTrendLabel, trendFromApi } from './trend'

describe('computeTrend', () => {
  it('is unavailable (not a fabricated 0%) when the baseline is zero', () => {
    const trend = computeTrend(500, 0)
    expect(trend.available).toBe(false)
    expect(trend.reason).toBe('baseline-unavailable')
  })

  it('is unavailable when either value is missing', () => {
    expect(computeTrend(undefined, 100).available).toBe(false)
    expect(computeTrend(100, null).available).toBe(false)
    expect(computeTrend(undefined, undefined).reason).toBe('no-data')
  })

  it('computes a real percentage change when both values are valid', () => {
    const trend = computeTrend(150, 100)
    expect(trend.available).toBe(true)
    expect(trend.pct).toBe(50)
    expect(trend.direction).toBe('up')
  })

  it('treats a real drop to zero from a nonzero baseline as a meaningful -100%', () => {
    const trend = computeTrend(0, 100)
    expect(trend.available).toBe(true)
    expect(trend.pct).toBe(-100)
    expect(trend.direction).toBe('down')
  })
})

describe('formatTrendLabel', () => {
  it('never claims a trend without comparable data', () => {
    expect(formatTrendLabel({ available: false, reason: 'baseline-unavailable' })).toBe('No comparison data')
    expect(formatTrendLabel(null)).toBe('No comparison data')
  })

  it('supports a custom unavailable label', () => {
    expect(formatTrendLabel({ available: false }, { unavailableLabel: 'Baseline unavailable' })).toBe('Baseline unavailable')
  })

  it('formats an available trend with a sign', () => {
    expect(formatTrendLabel({ available: true, pct: 12 })).toBe('+12%')
    expect(formatTrendLabel({ available: true, pct: -8 })).toBe('-8%')
  })
})

describe('trendFromApi', () => {
  it('is unavailable when trendAvailable is false, ignoring any numeric trend value', () => {
    const trend = trendFromApi({ trend: 0, trendAvailable: false })
    expect(trend.available).toBe(false)
  })

  it('is available when trendAvailable is true and trend is a finite number', () => {
    const trend = trendFromApi({ trend: 25, trendAvailable: true })
    expect(trend.available).toBe(true)
    expect(trend.pct).toBe(25)
    expect(trend.direction).toBe('up')
  })
})

import { describe, it, expect } from 'vitest'
import {
  formatOrDash, formatEnumLabel, formatDateSafe, formatDateTimeSafe,
  formatFreshness, formatINR, formatSignedPercent, formatBoolean, formatName,
} from './format'

describe('formatOrDash', () => {
  it('renders a dash for null/undefined/empty values', () => {
    expect(formatOrDash(null)).toBe('—')
    expect(formatOrDash(undefined)).toBe('—')
    expect(formatOrDash('')).toBe('—')
  })
  it('passes through a real value', () => {
    expect(formatOrDash('hello')).toBe('hello')
  })
})

describe('formatEnumLabel', () => {
  it('formats SCREAMING_SNAKE_CASE into Title Case', () => {
    expect(formatEnumLabel('IN_PROGRESS')).toBe('In Progress')
  })
  it('formats PascalCase-no-space into spaced words', () => {
    expect(formatEnumLabel('LabTechnician')).toBe('Lab Technician')
  })
  it('formats hyphenated values into Title Case', () => {
    expect(formatEnumLabel('radiology-technician')).toBe('Radiology Technician')
  })
  it('preserves clinically meaningful special cases like blood groups', () => {
    expect(formatEnumLabel('A_POSITIVE')).toBe('A+')
    expect(formatEnumLabel('O_NEGATIVE')).toBe('O-')
  })
  it('preserves known abbreviations', () => {
    expect(formatEnumLabel('ICU')).toBe('ICU')
  })
  it('never renders a raw enum for missing values', () => {
    expect(formatEnumLabel(null)).toBe('—')
    expect(formatEnumLabel(undefined)).toBe('—')
    expect(formatEnumLabel('')).toBe('—')
  })
})

describe('formatDateSafe / formatDateTimeSafe', () => {
  it('never renders "Invalid Date" for a bad input', () => {
    expect(formatDateSafe('not-a-date')).not.toMatch(/Invalid Date/)
    expect(formatDateSafe('not-a-date')).toBe('—')
    expect(formatDateTimeSafe('not-a-date')).toBe('—')
  })
  it('renders a dash for null/undefined', () => {
    expect(formatDateSafe(null)).toBe('—')
    expect(formatDateSafe(undefined)).toBe('—')
  })
  it('formats a valid date', () => {
    const out = formatDateSafe('2026-05-09T10:00:00.000Z')
    expect(out).not.toBe('—')
    expect(out).toMatch(/2026/)
  })
})

describe('formatFreshness', () => {
  it('reports unavailable data honestly rather than fabricating a timestamp', () => {
    expect(formatFreshness(null)).toBe('Data unavailable')
    expect(formatFreshness(undefined)).toBe('Data unavailable')
    expect(formatFreshness('not-a-date')).toBe('Data unavailable')
  })
  it('reports "Updated just now" within the just-now window', () => {
    expect(formatFreshness(new Date())).toBe('Updated just now')
  })
  it('reports a retrieval time for older timestamps', () => {
    const old = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatFreshness(old)).toMatch(/^Retrieved at /)
  })
})

describe('formatINR', () => {
  it('formats a numeric amount as Indian Rupees', () => {
    const out = formatINR(125000)
    expect(out).toContain('₹')
    expect(out).toMatch(/1,25,000|125,000/)
  })
  it('falls back safely for non-finite input rather than throwing or showing NaN', () => {
    expect(formatINR(undefined)).toBe('₹0')
    expect(formatINR(NaN)).toBe('₹0')
    expect(formatINR('not-a-number')).toBe('₹0')
  })
})

describe('formatSignedPercent', () => {
  it('signs positive and negative values', () => {
    expect(formatSignedPercent(12)).toBe('+12%')
    expect(formatSignedPercent(-4)).toBe('-4%')
    expect(formatSignedPercent(0)).toBe('0%')
  })
  it('falls back for non-numeric input', () => {
    expect(formatSignedPercent(undefined)).toBe('—')
  })
})

describe('formatBoolean', () => {
  it('formats true/false and falls back for unknown', () => {
    expect(formatBoolean(true)).toBe('Yes')
    expect(formatBoolean(false)).toBe('No')
    expect(formatBoolean(undefined)).toBe('—')
    expect(formatBoolean(null)).toBe('—')
  })
})

describe('formatName', () => {
  it('trims and falls back for blank names, never [object Object] or undefined', () => {
    expect(formatName('  Jane Doe  ')).toBe('Jane Doe')
    expect(formatName('')).toBe('Unknown')
    expect(formatName(undefined)).toBe('Unknown')
    expect(formatName({ not: 'a string' })).toBe('Unknown')
  })
})

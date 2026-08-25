'use strict';

const NUMBER = '(-?\\d+(?:\\.\\d+)?)';
const RANGE_PATTERNS = [
  new RegExp(`^(.{2,100}?)\\s*[:=-]\\s*${NUMBER}\\s*([^()\\[\\]]*?)\\s*(?:\\(|\\[)\\s*${NUMBER}\\s*(?:-|–|to)\\s*${NUMBER}\\s*(?:\\)|\\])\\s*$`, 'i'),
  new RegExp(`^(.{2,100}?)\\s*[:=-]\\s*${NUMBER}\\s*([^,;]*?)\\s*(?:reference(?: range)?|normal(?: range)?|range)\\s*[:=-]?\\s*${NUMBER}\\s*(?:-|–|to)\\s*${NUMBER}\\s*$`, 'i'),
];

function statusFor(value, low, high) {
  if (value < low || value > high) return 'Abnormal';
  const span = high - low;
  if (span > 0 && (value <= low + span * 0.05 || value >= high - span * 0.05)) return 'Borderline';
  return 'Normal';
}

function parseReportMeasurements(reportText) {
  const findings = [];
  const seen = new Set();
  for (const rawLine of String(reportText || '').split(/\r?\n/).slice(0, 500)) {
    const line = rawLine.trim().replace(/\s+/g, ' ');
    if (!line) continue;
    let match = null;
    for (const pattern of RANGE_PATTERNS) {
      match = line.match(pattern);
      if (match) break;
    }
    if (!match) continue;
    const [, parameter, rawValue, unit, rawLow, rawHigh] = match;
    const value = Number(rawValue);
    const low = Number(rawLow);
    const high = Number(rawHigh);
    if (![value, low, high].every(Number.isFinite) || low >= high) continue;
    const key = parameter.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cleanUnit = unit.trim().slice(0, 30);
    const status = statusFor(value, low, high);
    findings.push({
      parameter: parameter.trim(),
      value: `${rawValue}${cleanUnit ? ` ${cleanUnit}` : ''}`,
      normalRange: `${rawLow}–${rawHigh}${cleanUnit ? ` ${cleanUnit}` : ''}`,
      status,
      explanation: status === 'Normal'
        ? 'The submitted value is within the reference range printed in this report.'
        : status === 'Borderline'
        ? 'The submitted value is near the edge of the reference range printed in this report.'
        : 'The submitted value is outside the reference range printed in this report and requires clinician interpretation.',
    });
    if (findings.length >= 50) break;
  }
  return findings;
}

module.exports = { parseReportMeasurements, statusFor };

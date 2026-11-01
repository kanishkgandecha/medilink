'use strict';

// Deterministic lab-report reader. Each line is read right to left: the
// reference range printed at the end, then the value just before it, then
// the test name. Statuses are calculated only against the range printed on
// the same line — no default ranges are ever applied (decision D-19). A
// value printed with a recognised lab unit but no range is listed as
// "Range not printed" with status "Not assessed".
//
// Supported range forms: "12-16", "12 – 16", "12 to 16", "(12-16)", "[12-16]",
// "Ref: 12-16", "< 200", "<= 200", "up to 40", "less than 5", "> 40",
// ">= 60", "more than 90", optionally after a label such as "Desirable:",
// "Normal:", "Optimal", or "Reference range". Commas in numbers and H / L / *
// flags anywhere on the line are tolerated.

const NUM = '(?<![\\w.])\\d+(?:,\\d+)*(?:\\.\\d+)?';
const LABEL = '(?:(?:bio\\.?\\s*)?ref(?:erence)?\\.?(?:\\s*(?:range|interval|value))?|normal(?:\\s*range)?|desirable|optimal|range)\\s*[:=-]?\\s*';
// H / L / * flags count only straight after a number or at the end of the
// line, so names such as "Low Density Lipoprotein" are left intact.
const stripFlags = (line) => line
  .replace(/(\d)\s*(?:H|L|HIGH|LOW|High|Low|\*+)(?=\s|$)/g, '$1')
  .replace(/\s+(?:H|L|HIGH|LOW|High|Low|\*+)$/, '');

const RANGE_AT_END = [
  { kind: 'between', pattern: new RegExp(`[([]?\\s*(?:${LABEL})?(${NUM})\\s*(?:-|–|—|to)\\s*(${NUM})\\s*[)\\]]?\\s*$`, 'i') },
  { kind: 'max', pattern: new RegExp(`[([]?\\s*(?:${LABEL})?(?:<=?|≤|up\\s*to|upto|less\\s+than|below)\\s*(${NUM})\\s*[)\\]]?\\s*$`, 'i') },
  { kind: 'min', pattern: new RegExp(`[([]?\\s*(?:${LABEL})?(?:>=?|≥|more\\s+than|greater\\s+than|above)\\s*(${NUM})\\s*[)\\]]?\\s*$`, 'i') },
];

// Common laboratory units; a value is only listed without a range when its
// unit is recognised, so ages, dates, and prose numbers are not picked up.
const LAB_UNIT = /^(?:g\/dl|mg\/dl|mg\/l|ng\/ml|ng\/dl|pg\/ml|[uµμ]g\/dl|[uµμ]g\/l|u\/l|iu\/l|miu\/l|[uµμ]iu\/ml|miu\/ml|mmol\/l|meq\/l|%|fl|pg|cells\/[uµμ]l|\/cumm|\/[uµμ]l|lakhs?\/cumm|x?10\^?[36]\/[uµμ]l|mm\/hr|ml\/min(?:\/1\.73\s?m2)?|g\/l|million\/[uµμ]l|mill\/cumm)$/i;
const NOT_A_TEST = /^(?:age|sex|date|time|page|sample|patient|name|ref(?:erred)? by|lab|report|uhid|id|mobile|phone)\b/i;

const toNumber = (text) => Number(String(text).replace(/,/g, ''));

// Any range-like expression, used to detect lines that print several ranges
// (by sex, age, or category). The value itself is a lone number and never
// matches.
const ANY_RANGE = new RegExp(`(?:${NUM}\\s*(?:-|–|—|to)\\s*${NUM}|(?:<=?|>=?|≤|≥)\\s*${NUM}|\\b(?:up\\s*to|upto|less\\s+than|more\\s+than|greater\\s+than)\\s*${NUM})`, 'gi');
const NORMAL_LABEL = /\b(?:normal|optimal|desirable|ref(?:erence)?(?:\s*(?:range|interval))?)\b\s*[:=-]?\s*/i;
// Range printed between the name and the value: "Bilirubin Total (0.2-1.2) 1.8 mg/dL".
const RANGE_BEFORE_VALUE = new RegExp(`^(.+?)\\s*[([]\\s*(${NUM})\\s*(?:-|–|—|to)\\s*(${NUM})\\s*[)\\]]\\s*([<>]?${NUM})\\s*(\\S*)$`, 'i');

function statusFor(value, low, high) {
  if (value < low || value > high) return 'Abnormal';
  const span = high - low;
  if (span > 0 && (value <= low + span * 0.05 || value >= high - span * 0.05)) return 'Borderline';
  return 'Normal';
}

// One-sided limits: Borderline within 5% of the limit on the inside.
function statusForLimit(value, kind, limit) {
  if (kind === 'max') return value > limit ? 'Abnormal' : value >= limit * 0.95 ? 'Borderline' : 'Normal';
  return value < limit ? 'Abnormal' : value <= limit * 1.05 ? 'Borderline' : 'Normal';
}

function cleanName(raw) {
  const name = raw.replace(/[\s:=\-–]+$/, '').replace(/^[\s:=\-–]+/, '').trim();
  return /[a-z]/i.test(name) && name.length >= 2 && name.length <= 100 && !NOT_A_TEST.test(name) ? name : null;
}

// Splits "<name> <value> <unit>" where the value is the last standalone number.
function splitMeasurement(left) {
  const tokens = left.trim().split(/\s+/);
  for (let i = tokens.length - 1; i > 0; i -= 1) {
    const match = tokens[i].match(/^([<>]?)(\d+(?:,\d+)*(?:\.\d+)?)$/);
    if (!match) continue;
    const name = cleanName(tokens.slice(0, i).join(' '));
    if (!name) return null;
    // Trailing category labels ("Male:") are not part of the unit.
    const unit = tokens.slice(i + 1).filter((t) => !/:$/.test(t)).join(' ').slice(0, 30);
    return { name, rawValue: tokens[i], value: toNumber(match[2]), unit };
  }
  return null;
}

function readLine(rawLine) {
  // Normalise spacing, then drop flags so they do not split value and unit.
  // Dotted or underlined leaders ("Hemoglobin ...... 12.5") are separators.
  const line = stripFlags(rawLine.replace(/[._]{3,}/g, ' ').trim().replace(/\s+/g, ' ')).trim();
  if (!line || line.length > 200) return null;

  // Several ranges on one line (e.g. "Male: 30-400 Female: 13-150" or
  // category bands): use the one labelled normal/optimal/reference if any;
  // otherwise do not guess which applies.
  // The value itself (first standalone number, possibly "<0.5") is not a range.
  const withoutValue = line.replace(/(^|\s)[<>]?\d+(?:,\d+)*(?:\.\d+)?(?=\s|$)/, '$1');
  const ranges = withoutValue.match(ANY_RANGE) || [];
  let firstBand = line;
  if (ranges.length > 1) {
    const labelled = line.match(NORMAL_LABEL);
    if (!labelled) {
      const bare = splitMeasurement(line.slice(0, line.search(ANY_RANGE)).replace(/[([][^)\]]*$/, ''));
      return bare ? { ...bare, status: 'Not assessed', normalRange: 'Several ranges printed (e.g. by sex or category); not assessed' } : null;
    }
    const start = labelled.index + labelled[0].length;
    const after = line.slice(start).match(ANY_RANGE)?.[0];
    firstBand = `${line.slice(0, labelled.index)}${after || ''}`.trim();
  }

  const before = line.match(RANGE_BEFORE_VALUE);
  if (before && ranges.length === 1) {
    const name = cleanName(before[1]);
    const low = toNumber(before[2]);
    const high = toNumber(before[3]);
    const value = toNumber(before[4].replace(/^[<>]/, ''));
    if (name && low < high && Number.isFinite(value)) {
      const unit = before[5].slice(0, 30);
      return { name, rawValue: before[4], value, unit, status: statusFor(value, low, high), normalRange: `${before[2]}–${before[3]}${unit ? ` ${unit}` : ''}` };
    }
  }

  for (const { kind, pattern } of RANGE_AT_END) {
    const range = firstBand.match(pattern);
    if (!range) continue;
    const measurement = splitMeasurement(firstBand.slice(0, range.index));
    if (!measurement || !Number.isFinite(measurement.value)) return null;
    const unitText = measurement.unit ? ` ${measurement.unit}` : '';
    if (kind === 'between') {
      const low = toNumber(range[1]);
      const high = toNumber(range[2]);
      if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high) return null;
      return { ...measurement, status: statusFor(measurement.value, low, high), normalRange: `${range[1]}–${range[2]}${unitText}` };
    }
    const limit = toNumber(range[1]);
    if (!Number.isFinite(limit)) return null;
    return { ...measurement, status: statusForLimit(measurement.value, kind, limit), normalRange: `${kind === 'max' ? '<' : '>'} ${range[1]}${unitText}` };
  }

  const bare = splitMeasurement(line);
  if (bare && LAB_UNIT.test(bare.unit)) return { ...bare, status: 'Not assessed', normalRange: 'Range not printed' };
  return null;
}

const EXPLANATIONS = {
  Normal: 'The submitted value is within the reference range printed in this report.',
  Borderline: 'The submitted value is near the edge of the reference range printed in this report.',
  Abnormal: 'The submitted value is outside the reference range printed in this report and requires clinician interpretation.',
  'Not assessed': 'No reference range is printed for this value, so it was not assessed. Ask a clinician to interpret it.',
};

function parseReportMeasurements(reportText) {
  const findings = [];
  const seen = new Set();
  for (const rawLine of String(reportText || '').split(/\r?\n/).slice(0, 500)) {
    const read = readLine(rawLine);
    if (!read) continue;
    const key = read.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({
      parameter: read.name,
      value: `${read.rawValue}${read.unit ? ` ${read.unit}` : ''}`,
      normalRange: read.normalRange,
      status: read.status,
      explanation: EXPLANATIONS[read.status],
    });
    if (findings.length >= 50) break;
  }
  return findings;
}

module.exports = { parseReportMeasurements, statusFor, statusForLimit };

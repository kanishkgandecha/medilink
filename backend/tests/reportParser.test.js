'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReportMeasurements, statusFor } = require('../services/ai/reportParser');

test('report parser extracts only measurements with explicit ranges', () => {
  const findings = parseReportMeasurements('Haemoglobin: 11.2 g/dL (12-17)\nWBC: 7200 cells/uL\nPlatelets: 210 (150-400)');
  assert.equal(findings.length, 2);
  assert.equal(findings[0].status, 'Abnormal');
  assert.equal(findings[1].status, 'Normal');
});

test('report parser rejects invalid and inverted ranges', () => {
  const findings = parseReportMeasurements('Test: 5 mg/dL (10-2)\nNarrative only');
  assert.equal(findings.length, 0);
});

test('range boundary classification is deterministic', () => {
  assert.equal(statusFor(5, 5, 10), 'Borderline');
  assert.equal(statusFor(7, 5, 10), 'Normal');
  assert.equal(statusFor(11, 5, 10), 'Abnormal');
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseReportMeasurements, statusFor } = require('../services/ai/reportParser');

test('report parser assesses only against printed ranges and lists unranged lab values as not assessed', () => {
  const findings = parseReportMeasurements('Haemoglobin: 11.2 g/dL (12-17)\nWBC: 7200 cells/uL\nPlatelets: 210 (150-400)\nAge: 45 Years');
  assert.deepEqual(findings.map((f) => [f.parameter, f.status, f.normalRange]), [
    ['Haemoglobin', 'Abnormal', '12–17 g/dL'],
    ['WBC', 'Not assessed', 'Range not printed'],
    ['Platelets', 'Normal', '150–400'],
  ]);
});

test('report parser reads table layouts, one-sided limits, flags, and ranges printed before the value', () => {
  const read = (line) => parseReportMeasurements(line).map((f) => [f.parameter, f.value, f.status]);
  assert.deepEqual(read('Hb 9.1 L g/dL 13.0 - 17.0'), [['Hb', '9.1 g/dL', 'Abnormal']]);
  assert.deepEqual(read('HDL Cholesterol 38 mg/dL >40'), [['HDL Cholesterol', '38 mg/dL', 'Abnormal']]);
  assert.deepEqual(read('SGPT/ALT 32 U/L Up to 40'), [['SGPT/ALT', '32 U/L', 'Normal']]);
  assert.deepEqual(read('Bilirubin Total (0.2-1.2) 1.8 mg/dL'), [['Bilirubin Total', '1.8 mg/dL', 'Abnormal']]);
  assert.deepEqual(read('Platelets 2,50,000 /cumm 1,50,000 - 4,50,000'), [['Platelets', '2,50,000 /cumm', 'Normal']]);
  assert.deepEqual(read('Low Density Lipoprotein 120 mg/dL < 100'), [['Low Density Lipoprotein', '120 mg/dL', 'Abnormal']]);
});

test('a line with several ranges is never judged against a guessed one', () => {
  const [ferritin] = parseReportMeasurements('Ferritin 8 ng/mL Male: 30-400 Female: 13-150');
  assert.equal(ferritin.status, 'Not assessed');
  const [triglycerides] = parseReportMeasurements('Triglycerides 210 mg/dL Normal: <150, Borderline: 150-199, High: 200-499');
  assert.equal(triglycerides.status, 'Abnormal', 'the range labelled Normal is used');
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

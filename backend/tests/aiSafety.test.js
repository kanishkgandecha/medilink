'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { enforceSymptomSafety, enforceReportSafety, enforceHealthRiskSafety, enforceAssistantSafety } = require('../services/ai/safety');

test('symptom safety overrides a model that misses an emergency', () => {
  const result = enforceSymptomSafety({ conditions: [], overallUrgency: 'Low' }, 'severe chest pain and difficulty breathing');
  assert.equal(result.overallUrgency, 'Critical');
  assert.equal(result.department, 'Emergency');
});

test('isolated chest and stomach pain receives urgent review without an automatic emergency claim', () => {
  const result = enforceSymptomSafety({
    overallUrgency: 'Critical',
    department: 'Emergency',
    conditions: [{ name: 'Cardiac Emergency', speciality: 'Cardiologist', advice: [], redFlags: [] }],
  }, 'chest pain and stomach pain');

  assert.equal(result.overallUrgency, 'High');
  assert.equal(result.recommendedSpeciality, 'General Physician / Urgent Care');
  assert.match(result.guidanceSummary, /same-day medical assessment/i);
  assert.equal('conditions' in result, false);
});

test('chest pain with a warning sign remains an emergency', () => {
  const result = enforceSymptomSafety({ overallUrgency: 'Low' }, 'chest pain with shortness of breath and sweating');
  assert.equal(result.overallUrgency, 'Critical');
  assert.equal(result.recommendedSpeciality, 'Emergency Medicine');
});

test('assistant drops arbitrary external and unknown navigation actions', () => {
  const result = enforceAssistantSafety({ actions: [
    { label: 'Steal session', route: 'https://evil.example', type: 'external' },
    { label: 'Unknown', route: '/admin/secrets', type: 'navigate' },
    { label: 'Appointments', route: '/appointments', type: 'navigate' },
  ] }, 'show my appointments');
  assert.deepEqual(result.actions, [{ label: 'Appointments', route: '/appointments', type: 'navigate' }]);
});

test('assistant crisis language cannot be downgraded by a model response', () => {
  const result = enforceAssistantSafety({ urgent: false, reply: 'Wait and see', actions: [] }, 'I am thinking about self-harm');
  assert.equal(result.urgent, true);
  assert.equal(result.intent, 'emergency');
  assert.equal(result.actions[0].route, 'tel:112');
});

test('symptom safety removes medication instructions', () => {
  const result = enforceSymptomSafety({ conditions: [{ name: 'Pain', urgency: 'Low', advice: ['Take ibuprofen 400mg'], redFlags: [] }] }, 'leg pain');
  assert.doesNotMatch(result.selfCare[0], /ibuprofen/i);
});

test('symptom safety never returns disease claims or probabilities', () => {
  const result = enforceSymptomSafety({
    conditions: [{ name: 'Heart disease', probability: 'High', advice: ['Rest'], redFlags: ['Worsening pain'] }],
    aiSummary: 'You most likely have heart disease.',
    overallUrgency: 'High',
  }, 'chest discomfort');

  assert.equal('conditions' in result, false);
  assert.equal('aiSummary' in result, false);
  assert.doesNotMatch(JSON.stringify(result), /most likely|heart disease|probability/i);
  assert.match(result.guidanceSummary, /does not|cannot|consult/i);
});

test('report safety rejects values absent from the original report', () => {
  const result = enforceReportSafety({ keyFindings: [{ parameter: 'Hb', value: '13.4 g/dL', status: 'Normal' }] }, 'Haemoglobin test performed');
  assert.equal(result.keyFindings.length, 0);
});

test('health risk cannot downgrade selected acute emergency symptoms', () => {
  const result = enforceHealthRiskSafety({ riskScore: 5, riskLevel: 'Low' }, ['chest_pain']);
  assert.equal(result.riskLevel, 'Critical');
  assert.ok(result.riskScore >= 70);
});

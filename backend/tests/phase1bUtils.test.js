'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBloodGroup } = require('../utils/bloodGroup');
const { toPatientSafeAiResult, patientSafeAiResponses } = require('../utils/aiPatientView');

test('normalizeBloodGroup accepts enum names and display labels, rejects anything else', () => {
  assert.equal(normalizeBloodGroup('A+'), 'A_POSITIVE');
  assert.equal(normalizeBloodGroup('ab-'), 'AB_NEGATIVE');
  assert.equal(normalizeBloodGroup('O_POSITIVE'), 'O_POSITIVE');
  assert.equal(normalizeBloodGroup(''), null);
  assert.equal(normalizeBloodGroup(null), null);
  assert.equal(normalizeBloodGroup('Z+'), undefined);
  assert.equal(normalizeBloodGroup('A_POSITIVE; DROP'), undefined);
});

test('patient AI view removes provider/model/fallback metadata at any depth and keeps guidance', () => {
  const result = toPatientSafeAiResult({
    overallUrgency: 'Low', selfCare: ['Rest'], requiresHumanReview: true, limitations: ['Not a diagnosis'],
    _source: 'llm', _model: 'provider/model', _degraded: true, _fallbackReason: 'provider_timeout',
    sourceType: 'llm', providerUsed: 'Provider', modelUsed: 'model', fallbackUsed: false,
    symptomAnalysis: { _source: 'rules', sourceLabel: 'Rules', conditions: [{ urgency: 'Low', _model: 'x' }] },
  });
  assert.deepEqual(Object.keys(result).sort(), ['limitations', 'overallUrgency', 'requiresHumanReview', 'selfCare', 'symptomAnalysis']);
  assert.deepEqual(result.symptomAnalysis, { conditions: [{ urgency: 'Low' }] });
});

test('patientSafeAiResponses only rewrites responses for the Patient role', () => {
  const run = (role) => {
    let sent;
    const res = { json: (body) => { sent = body; return body; } };
    patientSafeAiResponses({ user: { role } }, res, () => {});
    res.json({ success: true, data: { _source: 'rules', answer: 'ok' } });
    return sent;
  };
  assert.deepEqual(run('Patient').data, { answer: 'ok' });
  assert.deepEqual(run('Doctor').data, { _source: 'rules', answer: 'ok' });
});

const { sanitizeMetadata, auditRoute } = require('../utils/audit');

test('audit metadata keeps only allow-listed short scalar fields', () => {
  const clean = sanitizeMetadata({
    status: 'Confirmed', amount: 50, replayed: false, fields: ['allergies', 'insuranceInfo', 42],
    symptoms: 'synthetic chest pain', password: 'x', notes: 'free text', email: 'a@b.invalid', reason: 'free text',
  });
  assert.deepEqual(clean, { status: 'Confirmed', amount: 50, replayed: false, fields: ['allergies', 'insuranceInfo'] });
  assert.equal(sanitizeMetadata({ symptoms: 'x' }), undefined);
});

test('audit route middleware is tagged with its action for contract checks', () => {
  assert.equal(auditRoute('PATIENT_VIEWED').auditAction, 'PATIENT_VIEWED');
});

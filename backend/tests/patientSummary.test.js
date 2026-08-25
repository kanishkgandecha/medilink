'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGroundedSummary } = require('../services/ai/agents/patientSummary');

test('patient summary contains only recorded clinical facts and no billing advice', () => {
  const summary = buildGroundedSummary({
    patient: {
      user: { name: 'Test Patient', gender: 'Female', dateOfBirth: new Date('2000-01-01') },
      allergies: ['Penicillin'],
      medicalHistory: [{ condition: 'Asthma', status: 'Chronic', diagnosedDate: new Date('2020-01-01'), updatedAt: new Date('2020-01-01') }],
      currentMedications: [{ medicine: 'Recorded inhaler', dosage: '1 puff', frequency: 'Daily' }],
    },
    appointments: [], prescriptions: [],
  });
  assert.match(summary.medicalHistory[0], /Asthma/);
  assert.match(summary.currentMedications[0], /Recorded inhaler/);
  assert.doesNotMatch(JSON.stringify(summary), /bill|payment|service interruption/i);
  assert.equal(summary.provenance.clinicianReviewed, false);
});

test('absence of allergy data is presented as missing, not no known allergies', () => {
  const summary = buildGroundedSummary({
    patient: { user: { name: 'Test' }, allergies: [], medicalHistory: [], currentMedications: [] },
    appointments: [], prescriptions: [],
  });
  assert.ok(summary.missingData.some((item) => /does not confirm/i.test(item)));
  assert.deepEqual(summary.riskFlags, []);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePack, resolveLocale, assertHospitalLocation, loadPacks } = require('../services/ai/locale');
const { enforceSymptomSafety } = require('../services/ai/safety');

const contact = (overrides = {}) => ({
  number: '108', label: 'Ambulance (108)', purpose: 'ambulance',
  source: { title: 'Synthetic source', retrievedAt: '2026-11-01' },
  reviewStatus: 'pending_clinician_review', reviewedBy: null, ...overrides,
});
const pack = (c) => ({ code: 'IN-ZZ', parent: 'IN', name: 'Synthetic', aliases: [], languages: ['en'], contacts: { ambulance: c } });

test('pack validation requires a source and a consistent clinician review status', () => {
  assert.deepEqual(validatePack(pack(contact())), []);
  assert.match(validatePack(pack(contact({ source: {} }))).join(), /source/);
  assert.match(validatePack(pack(contact({ reviewStatus: 'approved' }))).join(), /no reviewedBy/);
  assert.match(validatePack(pack(contact({ reviewedBy: 'Dr Synthetic' }))).join(), /not approved/);
  assert.match(validatePack(pack(contact({ number: 'tel:108' }))).join(), /digits/);
});

test('every shipped pack is valid and still pending doctor review', () => {
  for (const p of Object.values(loadPacks())) {
    for (const c of Object.values(p.contacts)) assert.equal(c.reviewStatus, 'pending_clinician_review', `${p.code} must stay pending until the doctor approves`);
  }
});

test('the hospital location must match a pack', () => {
  assert.doesNotThrow(() => assertHospitalLocation({ HOSPITAL_STATE: 'Maharashtra' }));
  assert.doesNotThrow(() => assertHospitalLocation({}));
  assert.throws(() => assertHospitalLocation({ HOSPITAL_STATE: 'Maharastraa' }), /HOSPITAL_STATE/);
  assert.throws(() => assertHospitalLocation({ HOSPITAL_COUNTRY: 'Atlantis' }), /HOSPITAL_COUNTRY/);
});

test('emergency guidance uses the location numbers without changing urgency', () => {
  const gujarat = enforceSymptomSafety({}, 'severe chest pain', resolveLocale({ state: 'Gujarat' }, {}));
  const abroad = enforceSymptomSafety({}, 'severe chest pain', resolveLocale({ country: 'United Kingdom' }, {}));
  assert.equal(gujarat.overallUrgency, abroad.overallUrgency);
  assert.match(gujarat.selfCare[0], /112.*108/);
  assert.deepEqual(abroad.emergencyContacts, []);
  assert.match(abroad.selfCare[0], /local emergency number/);
});

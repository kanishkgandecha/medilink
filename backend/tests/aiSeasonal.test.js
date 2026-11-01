'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePack, resolveLocale, loadPacks } = require('../services/ai/locale');
const { activeSeasons, monthInIndia } = require('../services/ai/seasonal');
const { enforceSymptomSafety } = require('../services/ai/safety');
const { detectEmergency } = require('../services/ai/emergency');

const base = { code: 'IN-ZZ', parent: 'IN', name: 'Synthetic', aliases: [], languages: ['en'], contacts: {} };
const season = (overrides) => ({ id: 'summer-heat', months: [4, 5], source: { title: 'Synthetic', retrievedAt: '2026-11-01' }, reviewStatus: 'pending_clinician_review', reviewedBy: null, ...overrides });

test('season entries need a known rule, valid months, a source, and a review status', () => {
  assert.deepEqual(validatePack({ ...base, seasons: [season()] }), []);
  assert.match(validatePack({ ...base, seasons: [season({ id: 'made-up' })] }).join(), /unknown id/);
  assert.match(validatePack({ ...base, seasons: [season({ months: [0, 13] })] }).join(), /months/);
  assert.match(validatePack({ ...base, seasons: [season({ source: {} })] }).join(), /source/);
});

test('shipped seasons stay pending doctor review', () => {
  for (const p of Object.values(loadPacks())) for (const s of p.seasons || []) assert.equal(s.reviewStatus, 'pending_clinician_review', `${p.code} ${s.id}`);
});

test('the season month follows India time', () => {
  assert.equal(monthInIndia(new Date('2026-05-31T20:00:00Z')), 6, '1:30 am on 1 June in India');
  const rajasthan = (iso) => activeSeasons(resolveLocale({ state: 'Rajasthan' }, {}, { asOf: new Date(iso) })).map((s) => s.id);
  assert.deepEqual(rajasthan('2026-05-15T12:00:00+05:30'), ['summer-heat']);
  assert.deepEqual(rajasthan('2026-08-15T12:00:00+05:30'), ['monsoon-fever']);
  assert.deepEqual(rajasthan('2026-01-15T12:00:00+05:30'), []);
});

test('model text that names a disease is never shown', () => {
  const out = enforceSymptomSafety({
    overallUrgency: 'Low', guidanceSummary: 'This looks like dengue.', selfCare: ['Rest well', 'Typical of malaria, see a doctor'], redFlags: ['Signs of heat stroke', 'Fainting'],
  }, 'mild fever', resolveLocale({ country: 'United Kingdom' }, {}));
  assert.doesNotMatch(JSON.stringify(out), /dengue|malaria|heat stroke/i);
  assert.deepEqual(out.selfCare, ['Rest well']);
  assert.deepEqual(out.redFlags, ['Fainting']);
});

test('overheating with hot dry skin is an emergency in any place and month', () => {
  assert.equal(detectEmergency('worked outside in the heat, now hot dry skin').emergency, true);
  assert.equal(detectEmergency('hot dry skin from eczema').emergency, false);
});

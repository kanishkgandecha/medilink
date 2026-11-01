'use strict';

// Location packs (services/ai/locales/*.json) supply region-specific data —
// emergency contacts now; languages, seasons, and formats in later phases.
// Packs are data, not code: each entry records its source and clinician
// review status, and a pack that fails validation stops the server loading.
//
// Resolution: patient state → hospital state (HOSPITAL_STATE) → country pack
// (patient country, else HOSPITAL_COUNTRY, default IN) → GLOBAL. A patient
// state that has no pack falls back to the national pack only; it never
// borrows the hospital's state. Location can only add contacts or guidance —
// it never changes urgency.

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'locales');
const REVIEW_STATUSES = new Set(['pending_clinician_review', 'approved']);
const PURPOSES = new Set(['emergency', 'ambulance', 'mental-health']);

const clean = (value) => String(value || '').toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ').trim();

function validatePack(pack, file = pack?.code) {
  const problems = [];
  const where = (msg) => problems.push(`${file}: ${msg}`);
  if (!pack || typeof pack !== 'object') return [`${file}: not an object`];
  if (!/^(GLOBAL|[A-Z]{2}(-[A-Z]{2})?)$/.test(pack.code || '')) where('code must be GLOBAL, a country code, or COUNTRY-STATE');
  if (pack.code !== 'GLOBAL' && !pack.parent) where('parent is required');
  if (!pack.name) where('name is required');
  if (!Array.isArray(pack.aliases)) where('aliases must be an array');
  if (!Array.isArray(pack.languages) || !pack.languages.length) where('languages must be a non-empty array');
  for (const [key, contact] of Object.entries(pack.contacts || {})) {
    const at = (msg) => where(`contacts.${key} ${msg}`);
    if (!PURPOSES.has(contact.purpose)) at('has an unknown purpose');
    if (contact.number !== null && !/^\d{3,12}$/.test(contact.number || '')) at('number must be 3–12 digits or null');
    if (!contact.label) at('needs a label');
    if (!contact.source?.title || !contact.source?.retrievedAt) at('needs source.title and source.retrievedAt');
    if (!REVIEW_STATUSES.has(contact.reviewStatus)) at('needs reviewStatus pending_clinician_review or approved');
    if (contact.reviewStatus === 'approved' && !contact.reviewedBy) at('is approved but has no reviewedBy');
    if (contact.reviewStatus !== 'approved' && contact.reviewedBy) at('names a reviewer but is not approved');
  }
  return problems;
}

let cache = null;

function loadPacks() {
  if (cache) return cache;
  const packs = {};
  const problems = [];
  for (const file of fs.readdirSync(LOCALES_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const pack = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
    problems.push(...validatePack(pack, file));
    if (`${pack.code}.json` !== file) problems.push(`${file}: file name must match code ${pack.code}`);
    packs[pack.code] = pack;
  }
  for (const pack of Object.values(packs)) {
    if (pack.parent && !packs[pack.parent]) problems.push(`${pack.code}: parent ${pack.parent} has no pack`);
  }
  if (!packs.GLOBAL) problems.push('GLOBAL pack is missing');
  if (problems.length) throw new Error(`Invalid AI location packs:\n${problems.join('\n')}`);
  cache = packs;
  return packs;
}

const findPack = (packs, value, parent) => {
  const wanted = clean(value);
  if (!wanted) return null;
  return Object.values(packs).find((p) => p.parent === parent && (clean(p.name) === wanted || p.aliases.map(clean).includes(wanted))) || null;
};

function resolveLocale({ country, state } = {}, env = process.env) {
  const packs = loadPacks();
  const countryPack = findPack(packs, country, 'GLOBAL')
    || (!clean(country) && findPack(packs, env.HOSPITAL_COUNTRY || 'IN', 'GLOBAL'))
    || null;

  let statePack = null;
  let basis = clean(state) ? 'patient' : 'hospital';
  if (countryPack) {
    statePack = clean(state)
      ? findPack(packs, state, countryPack.code)
      : findPack(packs, env.HOSPITAL_STATE, countryPack.code);
  }
  if (!clean(state) && !statePack) basis = clean(country) ? 'patient' : 'default';

  const chain = [packs.GLOBAL, countryPack, statePack].filter(Boolean);
  const leaf = chain[chain.length - 1];
  return {
    code: leaf.code,
    chain: chain.map((p) => p.code),
    basis,
    languages: leaf.languages,
    formats: Object.assign({}, ...chain.map((p) => p.formats || {})),
    contacts: Object.assign({}, ...chain.map((p) => p.contacts || {})),
  };
}

// Ordered call options for an emergency response; mental-health support is
// added only for self-harm presentations.
function emergencyContacts(locale, { selfHarm = false } = {}) {
  const { emergency, ambulance, mentalHealth } = locale.contacts;
  return [emergency, ambulance, selfHarm ? mentalHealth : null]
    .filter((c) => c && c.number)
    .map(({ label, number, purpose }) => ({ label, number, purpose }));
}

function emergencyInstruction(locale) {
  const { emergency, ambulance } = locale.contacts;
  if (!emergency?.number) return 'Call your local emergency number now or go to the nearest emergency department.';
  return `Call ${emergency.number} now${ambulance?.number ? ` (ambulance: ${ambulance.number})` : ''} or go to the nearest emergency department.`;
}

// Startup check: packs must be valid, and a configured hospital location must
// match a pack (a typo would otherwise silently fall back to national data).
function assertHospitalLocation(env = process.env) {
  const packs = loadPacks();
  const country = findPack(packs, env.HOSPITAL_COUNTRY || 'IN', 'GLOBAL');
  if (env.HOSPITAL_COUNTRY && !country) throw new Error('HOSPITAL_COUNTRY does not match any AI location pack');
  if (env.HOSPITAL_STATE && !(country && findPack(packs, env.HOSPITAL_STATE, country.code))) {
    throw new Error('HOSPITAL_STATE does not match any AI location pack for HOSPITAL_COUNTRY');
  }
}

module.exports = { loadPacks, validatePack, resolveLocale, emergencyContacts, emergencyInstruction, assertHospitalLocation };

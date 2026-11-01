'use strict';

// Language packs (services/ai/languages/*.json) map Hindi, Marathi, and
// Gujarati phrases — native script and romanised — to the English terms the
// rules already understand. Matching adds the English terms alongside the
// original text; it never removes or rewrites what the person wrote, and the
// original text is what the AI provider receives.
//
// Romanised spelling varies widely ("seene mein" / "sine me"), so romanised
// text and phrases are folded the same way before matching, and up to two
// extra words (e.g. "tez", "bahut") may sit between a phrase's words.

const fs = require('fs');
const path = require('path');

const LANGUAGES_DIR = path.join(__dirname, 'languages');
const REVIEW_STATUSES = new Set(['pending', 'approved']);

// Equivalent spellings of the same sound in Indic scripts.
const foldScript = (text) => text
  .normalize('NFC')
  .replace(/ँ/g, 'ं')   // Devanagari chandrabindu → anusvara
  .replace(/़/g, '')         // Devanagari nukta
  .replace(/ઁ/g, 'ં')   // Gujarati chandrabindu → anusvara
  .replace(/઼/g, '');        // Gujarati nukta

// Common variations in romanised Hindi / Marathi / Gujarati.
const foldRoman = (word) => (/^[a-z]+$/.test(word)
  ? word
    .replace(/^mein$/, 'me').replace(/^mai$/, 'me').replace(/^main$/, 'me').replace(/^nahin$/, 'nahi').replace(/^nhi$/, 'nahi')
    .replace(/chh/g, 'ch').replace(/ph/g, 'f').replace(/z/g, 'j').replace(/w/g, 'v').replace(/sh/g, 's')
    .replace(/aa+/g, 'a').replace(/ee+/g, 'i').replace(/oo+/g, 'u').replace(/(.)\1+/g, '$1')
  : word);

const tokenize = (text) => foldScript(String(text || '').toLowerCase())
  .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
  .split(/\s+/)
  .filter(Boolean)
  .map(foldRoman);

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function compilePhrase(phrase) {
  const tokens = tokenize(phrase);
  const body = tokens.map(escape).join('(?:\\s+\\S+){0,2}?\\s+');
  return new RegExp(`(?<![\\p{L}\\p{M}])${body}(?![\\p{L}\\p{M}])`, 'u');
}

function validateLanguagePack(pack, file = pack?.code) {
  const problems = [];
  const where = (msg) => problems.push(`${file}: ${msg}`);
  if (!/^[a-z]{2,3}$/.test(pack?.code || '')) where('code must be an ISO 639 language code');
  if (!pack?.name) where('name is required');
  for (const key of ['clinician', 'nativeSpeaker']) {
    const review = pack?.review?.[key];
    if (!review || !REVIEW_STATUSES.has(review.status)) where(`review.${key}.status must be pending or approved`);
    else if (review.status === 'approved' && !review.reviewedBy) where(`review.${key} is approved but has no reviewedBy`);
    else if (review.status !== 'approved' && review.reviewedBy) where(`review.${key} names a reviewer but is not approved`);
  }
  if (!pack?.source) where('source is required');
  if (!Array.isArray(pack?.entries) || !pack.entries.length) where('entries must be a non-empty array');
  for (const [i, entry] of (pack?.entries || []).entries()) {
    if (!/^[a-z][a-z ']+$/.test(entry.en || '')) where(`entries[${i}].en must be plain lower-case English`);
    if (!Array.isArray(entry.phrases) || !entry.phrases.length) where(`entries[${i}].phrases must be a non-empty array`);
    for (const phrase of entry.phrases || []) if (!tokenize(phrase).length) where(`entries[${i}] has an empty phrase`);
  }
  return problems;
}

let compiled = null;

function loadLanguagePacks() {
  if (compiled) return compiled;
  const packs = [];
  const problems = [];
  for (const file of fs.readdirSync(LANGUAGES_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const pack = JSON.parse(fs.readFileSync(path.join(LANGUAGES_DIR, file), 'utf8'));
    problems.push(...validateLanguagePack(pack, file));
    if (`${pack.code}.json` !== file) problems.push(`${file}: file name must match code ${pack.code}`);
    packs.push(pack);
  }
  if (problems.length) throw new Error(`Invalid AI language packs:\n${problems.join('\n')}`);
  compiled = {
    packs,
    rules: packs.flatMap((pack) => pack.entries.flatMap((entry) => entry.phrases.map((phrase) => ({ language: pack.code, en: entry.en, pattern: compilePhrase(phrase) })))),
  };
  return compiled;
}

// Returns the English terms (and their languages) recognised in the text.
function recognise(value) {
  const text = tokenize(Array.isArray(value) ? value.join(' ') : value).join(' ');
  if (!text) return { terms: [], languages: [] };
  const terms = new Set();
  const languages = new Set();
  for (const rule of loadLanguagePacks().rules) {
    if (rule.pattern.test(text)) { terms.add(rule.en); languages.add(rule.language); }
  }
  return { terms: [...terms], languages: [...languages] };
}

// The original text followed by any recognised English terms, for rule matching.
function withEnglish(value) {
  const original = Array.isArray(value) ? value.join(' ') : String(value || '');
  const { terms } = recognise(original);
  return terms.length ? `${original} . ${terms.join(' . ')}` : original;
}

module.exports = { loadLanguagePacks, validateLanguagePack, recognise, withEnglish, tokenize };

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLanguagePack, loadLanguagePacks, recognise, withEnglish } = require('../services/ai/language');

const pack = (review) => ({ code: 'hi', name: 'Hindi', source: 'synthetic', review, entries: [{ en: 'fever', phrases: ['bukhar'] }] });
const pending = { status: 'pending', reviewedBy: null };

test('language packs need both a clinician and a native-speaker review status', () => {
  assert.deepEqual(validateLanguagePack(pack({ clinician: pending, nativeSpeaker: pending })), []);
  assert.match(validateLanguagePack(pack({ clinician: pending })).join(), /nativeSpeaker/);
  assert.match(validateLanguagePack(pack({ clinician: { status: 'approved', reviewedBy: null }, nativeSpeaker: pending })).join(), /no reviewedBy/);
});

test('shipped language packs stay pending until review is confirmed', () => {
  for (const p of loadLanguagePacks().packs) {
    assert.equal(p.review.clinician.status, 'pending', `${p.code} clinician review`);
    assert.equal(p.review.nativeSpeaker.status, 'pending', `${p.code} native-speaker review`);
  }
});

test('spelling variants in romanised text and Indic scripts are recognised', () => {
  assert.deepEqual(recognise('sine me tej dard').terms, ['chest pain']);
  assert.deepEqual(recognise('seene mein bahut tez dard').terms, ['chest pain']);
  assert.deepEqual(recognise('साँस नहीं आ रही').terms, recognise('सांस नहीं आ रही').terms);
  assert.deepEqual(recognise('ज़हर खा लिया').terms, ['poisoning']);
});

test('stems match Tamil, Telugu, and Bengali word endings, including a dropped virama', () => {
  assert.ok(recognise('தம்பி விஷம் குடித்துவிட்டான்').terms.includes('poisoning'));
  assert.ok(recognise('நெஞ்சில் பாரமாக இருக்கிறது').terms.includes('chest pain'));
  assert.ok(recognise('గుండెలో నొప్పి గా ఉంది').terms.includes('chest pain'));
  assert.ok(recognise('বুকটা খুব ব্যথা করছে').terms.includes('chest pain'));
  // A stem only extends the end of its own word.
  assert.deepEqual(recognise('நெஞ்சுக்கு அருகில்').terms, []);
});

test('the original text is kept and ordinary English matches nothing', () => {
  assert.match(withEnglish('pet dard'), /^pet dard \. stomach pain$/);
  for (const text of ['I tapped my knee, sir', 'call me tomorrow', 'dust allergy', 'the fit is fine']) {
    assert.deepEqual(recognise(text).terms, [], text);
  }
});

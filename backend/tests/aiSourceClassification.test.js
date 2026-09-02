'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SOURCE_TYPES, SOURCE_LABELS, classifySource, buildSourceMeta,
} = require('../services/ai/sourceClassification');

test('classifies a successful LLM call as llm', () => {
  assert.equal(classifySource({ _source: 'llm', _model: 'openai/gpt-4o-mini' }), SOURCE_TYPES.LLM);
});

test('classifies a degraded callLLM fallback as degraded-fallback, not plain rules', () => {
  assert.equal(classifySource({ _source: 'rules', _degraded: true }), SOURCE_TYPES.DEGRADED_FALLBACK);
});

test('classifies rules-by-design (never attempted an LLM) as rules, not degraded', () => {
  assert.equal(classifySource({ _source: 'rules', _degraded: false }), SOURCE_TYPES.RULES);
  assert.equal(classifySource({ _source: 'rules' }), SOURCE_TYPES.RULES);
});

test('classifies records and live-records sources directly', () => {
  assert.equal(classifySource({ _source: 'records' }), SOURCE_TYPES.RECORDS);
  assert.equal(classifySource({ _source: 'live-records' }), SOURCE_TYPES.LIVE_RECORDS);
});

test('treats an unrecognized frontend-only local fallback as a degraded fallback', () => {
  assert.equal(classifySource({ _source: 'local-rules' }), SOURCE_TYPES.DEGRADED_FALLBACK);
});

test('defaults to rules for missing or unrecognized data rather than guessing llm', () => {
  assert.equal(classifySource(undefined), SOURCE_TYPES.RULES);
  assert.equal(classifySource({}), SOURCE_TYPES.RULES);
});

test('buildSourceMeta discloses provider/model only for a genuine llm result', () => {
  const meta = buildSourceMeta({ _source: 'llm', _model: 'openai/gpt-4o-mini' });
  assert.equal(meta.sourceType, SOURCE_TYPES.LLM);
  assert.equal(meta.sourceLabel, 'LLM');
  assert.equal(meta.providerUsed, 'OpenRouter');
  assert.equal(meta.modelUsed, 'openai/gpt-4o-mini');
  assert.equal(meta.fallbackUsed, false);
});

test('buildSourceMeta never discloses a model name after degraded fallback', () => {
  const meta = buildSourceMeta({ _source: 'rules', _degraded: true, _model: 'openai/gpt-4o-mini' });
  assert.equal(meta.sourceType, SOURCE_TYPES.DEGRADED_FALLBACK);
  assert.equal(meta.sourceLabel, 'Degraded Fallback');
  assert.equal(meta.providerUsed, null);
  assert.equal(meta.modelUsed, null);
  assert.equal(meta.fallbackUsed, true);
});

test('buildSourceMeta never discloses provider/model for a rules-only result', () => {
  const meta = buildSourceMeta({ _source: 'rules' });
  assert.equal(meta.providerUsed, null);
  assert.equal(meta.modelUsed, null);
});

test('buildSourceMeta honors an explicit forceSourceType and still withholds provider/model', () => {
  // Bed Allocation / Appointment Optimizer: the LLM attempt may have
  // succeeded, but its specific answer is discarded in favour of a fresh
  // live-database recomputation, so provider/model must never appear even
  // though `_source` on the raw metadata says 'llm'.
  const meta = buildSourceMeta({ _source: 'llm', _model: 'openai/gpt-4o-mini' }, {
    forceSourceType: SOURCE_TYPES.LIVE_RECORDS,
  });
  assert.equal(meta.sourceType, SOURCE_TYPES.LIVE_RECORDS);
  assert.equal(meta.sourceLabel, 'Live Records');
  assert.equal(meta.providerUsed, null);
  assert.equal(meta.modelUsed, null);
});

test('buildSourceMeta carries limitations and the human-review flag through', () => {
  const meta = buildSourceMeta({ _source: 'rules' }, {
    limitations: ['Example limitation'],
    requiresHumanReview: true,
  });
  assert.deepEqual(meta.limitations, ['Example limitation']);
  assert.equal(meta.requiresHumanReview, true);
});

test('every declared source type has a label and does not rely on color alone', () => {
  Object.values(SOURCE_TYPES).forEach((type) => {
    assert.ok(SOURCE_LABELS[type], `missing label for ${type}`);
  });
});

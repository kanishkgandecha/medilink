'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PATIENT_ASSISTANT } = require('../services/ai/promptTemplates');

test('patient assistant prompt includes only the intended user identity fields', () => {
  const prompt = PATIENT_ASSISTANT.user({
    message: 'hello', history: [],
    userData: { name: 'Synthetic Person Name', role: 'Patient', password: 'secret', resetPasswordToken: 'token-value', email: 'private@example.com' },
  });
  assert.match(prompt, /User role: Patient/);
  // Phase 3: the display name is no longer shared with the provider.
  assert.doesNotMatch(prompt, /Synthetic Person Name|secret|token-value|private@example\.com/);
});

const { redactIdentifiers } = require('../services/ai/privacy');

test('identifier redaction removes emails and phone-like numbers but keeps clinical values and dates', () => {
  const out = redactIdentifiers('Contact me at someone@example.invalid or +91 98765 43210 / 9876543210. Hb 10 g/dL, range 12-16, seen 2024-01-15, BP 120/80.');
  assert.doesNotMatch(out, /someone@example\.invalid|98765 43210|9876543210/);
  assert.match(out, /\[email\]/);
  assert.match(out, /\[number\]/);
  assert.match(out, /Hb 10 g\/dL, range 12-16, seen 2024-01-15, BP 120\/80/);
});

test('every prompt sent to the provider passes through redaction', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = global.fetch;
  let sent;
  process.env.OPENROUTER_API_KEY = 'test-key';
  global.fetch = async (_url, init) => { sent = JSON.parse(init.body); return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) }; };
  try {
    const { callLLM } = require('../services/ai/llmClient');
    await callLLM('system', 'my email is a.b@example.invalid and phone 9876543210', async () => ({}));
    assert.doesNotMatch(JSON.stringify(sent), /a\.b@example\.invalid|9876543210/);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

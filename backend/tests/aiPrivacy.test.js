'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PATIENT_ASSISTANT } = require('../services/ai/promptTemplates');

test('patient assistant prompt includes only the intended user identity fields', () => {
  const prompt = PATIENT_ASSISTANT.user({
    message: 'hello', history: [],
    userData: { name: 'Patient', role: 'Patient', password: 'secret', resetPasswordToken: 'token-value', email: 'private@example.com' },
  });
  assert.match(prompt, /Patient.*Role: Patient/);
  assert.doesNotMatch(prompt, /secret|token-value|private@example\.com/);
});

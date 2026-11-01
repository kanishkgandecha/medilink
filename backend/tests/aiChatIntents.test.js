'use strict';

// Rules path only: never reach the AI provider from unit tests.
process.env.OPENROUTER_API_KEY = '';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runPatientAssistant } = require('../services/ai/agents/patientAssistant');

const ask = async (message) => runPatientAssistant({ message, history: [] });

test('intents match whole words only', async () => {
  assert.equal((await ask("I'm feeling unwell, what could it be")).intent, 'symptoms', '"fee" in "feeling" is not billing');
  assert.equal((await ask('which procedure is due for my father')).intent, 'appointment', '"hi" in "which" is not a greeting');
});

test('navigation requests open the page they ask about', async () => {
  assert.deepEqual((await ask('how do I change my password')).actions.map((a) => a.route), ['/settings']);
  assert.deepEqual((await ask('update my email')).actions.map((a) => a.route), ['/profile']);
});

test('requests that are not understood get a menu of the main pages', async () => {
  const out = await ask('blorp zzz');
  assert.equal(out.intent, 'general');
  assert.deepEqual(out.actions.map((a) => a.route), ['/appointments', '/billing', '/prescriptions', '/test-reports', '/symptom-checker']);
});

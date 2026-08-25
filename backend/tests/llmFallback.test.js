'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { callLLM } = require('../services/ai/llmClient');

test('malformed provider output triggers an explicitly degraded fallback', async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = global.fetch;
  process.env.OPENROUTER_API_KEY = 'test-key';
  global.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) });
  try {
    const result = await callLLM('system', 'user', async () => ({ safe: true }));
    assert.equal(result.data.safe, true);
    assert.equal(result.data._source, 'rules');
    assert.equal(result.data._degraded, true);
    assert.equal(result.data._fallbackReason, 'provider_error');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});

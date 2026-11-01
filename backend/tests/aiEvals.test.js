'use strict';

// Ratchet over the offline AI evaluation suite (evals/): no metric may fall
// below its recorded baseline, and gates already met must stay met.

const test = require('node:test');
const assert = require('node:assert/strict');
const baseline = require('../evals/baseline.json').scores;
const { runAll, flatten, compare } = require('../evals/run');

test('AI agent evaluation scores never regress below the recorded baseline', async () => {
  const current = flatten(await runAll());
  assert.deepEqual(compare(current, baseline), []);
  for (const key of Object.keys(baseline)) assert.ok(key in current, `metric ${key} disappeared`);
});

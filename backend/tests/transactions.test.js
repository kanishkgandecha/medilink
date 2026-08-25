const test = require('node:test');
const assert = require('node:assert/strict');
const { runSerializableTransaction } = require('../utils/transactions');

test('serializable transaction retries write conflicts', async () => {
  let attempts = 0;
  const client = {
    $transaction: async (operation, options) => {
      attempts += 1;
      assert.equal(options.isolationLevel, 'Serializable');
      if (attempts < 3) throw Object.assign(new Error('write conflict'), { code: 'P2034' });
      return operation({});
    },
  };

  const result = await runSerializableTransaction(async () => 'ok', 3, client);
  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});

test('serializable transaction does not hide non-retryable errors', async () => {
  const expected = Object.assign(new Error('validation failed'), { code: 'P2002' });
  const client = { $transaction: async () => { throw expected; } };
  await assert.rejects(() => runSerializableTransaction(async () => 'unused', 3, client), expected);
});

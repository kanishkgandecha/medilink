'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { aiConcurrencyLimit } = require('../middleware/aiUsageLimits');

const response = () => {
  const res = new EventEmitter();
  res.set = () => res;
  res.status = (status) => { res.statusCode = status; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

test('AI concurrency limit rejects excess work and releases completed requests', () => {
  const previous = process.env.AI_MAX_CONCURRENT_REQUESTS;
  process.env.AI_MAX_CONCURRENT_REQUESTS = '2';
  const req = { user: { id: `concurrency-${Date.now()}` } };
  const first = response();
  const second = response();
  const third = response();
  let admitted = 0;

  aiConcurrencyLimit(req, first, () => { admitted += 1; });
  aiConcurrencyLimit(req, second, () => { admitted += 1; });
  aiConcurrencyLimit(req, third, () => { admitted += 1; });
  assert.equal(admitted, 2);
  assert.equal(third.statusCode, 429);
  assert.equal(third.body.code, 'AI_CONCURRENCY_LIMITED');

  first.emit('finish');
  const fourth = response();
  aiConcurrencyLimit(req, fourth, () => { admitted += 1; });
  assert.equal(admitted, 3);
  second.emit('finish');
  fourth.emit('finish');
  if (previous === undefined) delete process.env.AI_MAX_CONCURRENT_REQUESTS;
  else process.env.AI_MAX_CONCURRENT_REQUESTS = previous;
});

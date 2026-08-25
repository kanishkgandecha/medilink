const test = require('node:test');
const assert = require('node:assert/strict');
const { getPagination } = require('../utils/pagination');

test('pagination applies safe defaults for invalid input', () => {
  assert.deepEqual(getPagination({ page: '-2', limit: 'invalid' }), {
    page: 1,
    limit: 10,
    skip: 0,
  });
});

test('pagination caps requested limits', () => {
  assert.deepEqual(getPagination({ page: '3', limit: '10000' }, { maxLimit: 100 }), {
    page: 3,
    limit: 100,
    skip: 200,
  });
});

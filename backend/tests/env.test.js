const test = require('node:test');
const assert = require('node:assert/strict');
const { getJwtSecret, validateEnvironment } = require('../config/env');

const withEnvironment = (values, fn) => {
  const previous = { DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET };
  Object.assign(process.env, values);
  try {
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test('getJwtSecret rejects a missing or weak secret', () => {
  withEnvironment({ JWT_SECRET: 'too-short' }, () => {
    assert.throws(() => getJwtSecret(), /at least 32 characters/);
  });
});

test('validateEnvironment accepts required strong configuration', () => {
  withEnvironment({
    DATABASE_URL: 'postgresql://example.invalid/medilink',
    JWT_SECRET: 'a-secure-test-secret-with-32-characters',
  }, () => assert.doesNotThrow(() => validateEnvironment()));
});

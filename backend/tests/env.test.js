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

// ── Production fail-closed behavior (synthetic values only) ────────────────
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const strongSecret = () => crypto.randomBytes(48).toString('base64');
const prodEnv = (overrides = {}) => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://medilink_app:Xq9-synthetic-db-pass@db.invalid:5432/medilink',
  JWT_SECRET: strongSecret(),
  FRONTEND_URL: 'https://app.example.invalid',
  ...overrides,
});

const assertRejectsWithoutLeaking = (env, pattern) => {
  let message = '';
  assert.throws(() => validateEnvironment(env), (error) => {
    message = error.message;
    return pattern.test(error.message);
  });
  if (env.JWT_SECRET) assert.equal(message.includes(env.JWT_SECRET), false, 'error must not echo the secret');
  if (env.DATABASE_URL) assert.equal(message.includes(env.DATABASE_URL), false, 'error must not echo the URL');
};

test('production accepts a random JWT secret and a non-default database password', () => {
  assert.doesNotThrow(() => validateEnvironment(prodEnv()));
});

test('production refuses a missing, blank, or whitespace-only JWT secret', () => {
  assertRejectsWithoutLeaking(prodEnv({ JWT_SECRET: undefined }), /Missing required environment variables: JWT_SECRET/);
  assertRejectsWithoutLeaking(prodEnv({ JWT_SECRET: '' }), /Missing required environment variables: JWT_SECRET/);
  assertRejectsWithoutLeaking(prodEnv({ JWT_SECRET: ' '.repeat(40) }), /Missing required environment variables: JWT_SECRET/);
});

test('production refuses placeholder-looking and low-variety JWT secrets', () => {
  assertRejectsWithoutLeaking(prodEnv({ JWT_SECRET: 'replace-me-with-a-long-random-value-0001' }), /placeholder or default/);
  assertRejectsWithoutLeaking(prodEnv({ JWT_SECRET: 'ab'.repeat(24) }), /too little character variety/);
});

test('production refuses the JWT secret value published in .env.example', () => {
  const example = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  const published = (example.match(/^JWT_SECRET=(.*)$/m) || [])[1];
  assert.ok(published, '.env.example should declare a JWT_SECRET placeholder');
  assertRejectsWithoutLeaking(prodEnv({ JWT_SECRET: published }), /Refusing to start in production: JWT_SECRET/);
});

test('production refuses default or empty database passwords and missing DATABASE_URL', () => {
  assertRejectsWithoutLeaking(prodEnv({ DATABASE_URL: 'postgresql://postgres:postgres@db:5432/medilink' }), /default database password/);
  assertRejectsWithoutLeaking(prodEnv({ DATABASE_URL: 'postgresql://postgres@db:5432/medilink' }), /default database password/);
  assertRejectsWithoutLeaking(prodEnv({ DATABASE_URL: '' }), /Missing required environment variables: DATABASE_URL/);
});

test('non-production keeps the length rule but does not apply production-only checks', () => {
  assert.doesNotThrow(() => validateEnvironment({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/medilink',
    JWT_SECRET: 'replace-me-with-a-long-random-value-0001',
  }));
  assert.throws(() => validateEnvironment({ NODE_ENV: 'development', DATABASE_URL: 'postgresql://x/y', JWT_SECRET: 'short' }), /at least 32/);
});

test('production refuses to start without a configured CORS origin', () => {
  assertRejectsWithoutLeaking(prodEnv({ FRONTEND_URL: undefined }), /FRONTEND_URL \(or CORS_ORIGINS\)/);
  assert.doesNotThrow(() => validateEnvironment(prodEnv({ FRONTEND_URL: undefined, CORS_ORIGINS: 'https://a.example.invalid, https://b.example.invalid' })));
});

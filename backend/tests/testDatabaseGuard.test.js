'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSafeTestDatabase, useSafeTestDatabase, UnsafeTestDatabaseError } = require('../tests-integration/support/databaseGuard');

// Synthetic connection strings only; none of these hosts exist.
const DEV = 'postgresql://dev_user:synthetic-dev-pass@localhost:5432/medilink?schema=public';
const TEST = 'postgresql://test_user:synthetic-test-pass@localhost:5432/medilink_test?schema=public';
const safeEnv = (overrides = {}) => ({
  NODE_ENV: 'test', DATABASE_URL: DEV, TEST_DATABASE_URL: TEST,
  MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'medilink_test', ...overrides,
});

const refuses = (env, pattern) => {
  assert.throws(() => assertSafeTestDatabase(env), (error) => {
    assert.ok(error instanceof UnsafeTestDatabaseError);
    assert.match(error.message, pattern);
    assert.equal(error.message.includes('synthetic-'), false, 'credentials are never echoed');
    return true;
  });
};

test('accepts an explicitly confirmed *_test database distinct from DATABASE_URL', () => {
  assert.deepEqual(assertSafeTestDatabase(safeEnv()), { host: 'localhost', port: '5432', database: 'medilink_test' });
});

test('refuses when TEST_DATABASE_URL is missing (never falls back to DATABASE_URL)', () => {
  refuses(safeEnv({ TEST_DATABASE_URL: undefined }), /TEST_DATABASE_URL is not set/);
});

test('refuses the development application database and reserved names', () => {
  refuses(safeEnv({ TEST_DATABASE_URL: DEV, MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'medilink' }), /reserved/);
  refuses(safeEnv({ TEST_DATABASE_URL: 'postgresql://u:synthetic-x@localhost/postgres', MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'postgres' }), /reserved/);
});

test('refuses database names not marked as disposable test databases', () => {
  refuses(safeEnv({ TEST_DATABASE_URL: 'postgresql://u:synthetic-x@localhost/medilink_staging', MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'medilink_staging' }), /must end in "_test"/);
  refuses(safeEnv({ TEST_DATABASE_URL: 'postgresql://u:synthetic-x@localhost/test_medilink', MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'test_medilink' }), /must end in "_test"/);
});

test('refuses without the explicit per-database confirmation', () => {
  refuses(safeEnv({ MEDILINK_INTEGRATION_TEST_DB_CONFIRM: undefined }), /MEDILINK_INTEGRATION_TEST_DB_CONFIRM/);
  refuses(safeEnv({ MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'other_test' }), /MEDILINK_INTEGRATION_TEST_DB_CONFIRM/);
});

test('refuses when TEST_DATABASE_URL and DATABASE_URL are the same database', () => {
  refuses(safeEnv({ DATABASE_URL: TEST }), /same database as DATABASE_URL/);
});

test('refuses in production and for non-postgres or malformed URLs', () => {
  refuses(safeEnv({ NODE_ENV: 'production' }), /NODE_ENV is production/);
  refuses(safeEnv({ TEST_DATABASE_URL: 'mysql://u:synthetic-x@localhost/medilink_test' }), /postgresql:\/\//);
  refuses(safeEnv({ TEST_DATABASE_URL: 'not a url' }), /not a valid connection URL/);
});

test('useSafeTestDatabase repoints DATABASE_URL only after validation succeeds', () => {
  const env = safeEnv();
  useSafeTestDatabase(env);
  assert.equal(env.DATABASE_URL, TEST);

  const unsafe = safeEnv({ TEST_DATABASE_URL: DEV, MEDILINK_INTEGRATION_TEST_DB_CONFIRM: 'medilink' });
  assert.throws(() => useSafeTestDatabase(unsafe));
  assert.equal(unsafe.DATABASE_URL, DEV, 'DATABASE_URL is untouched when the guard refuses');
});

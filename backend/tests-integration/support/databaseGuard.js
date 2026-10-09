'use strict';

// Integration tests create and delete records. They must only ever run against
// a disposable database that is explicitly identified as a test database.
//
// Requirements (all must hold, otherwise the suite refuses to start):
//   1. TEST_DATABASE_URL is set (DATABASE_URL is never used directly).
//   2. MEDILINK_INTEGRATION_TEST_DB_CONFIRM equals the database name in
//      TEST_DATABASE_URL (an explicit, per-database confirmation).
//   3. The database name ends in "_test" (e.g. medilink_test).
//   4. It is not a well-known application/system database name.
//   5. It does not point at the same host/port/database as DATABASE_URL
//      (the development or production application database).
//   6. NODE_ENV is not "production".

const RESERVED_DATABASE_NAMES = new Set(['medilink', 'postgres', 'template0', 'template1', 'production', 'prod', 'dev', 'development']);
const TEST_DATABASE_NAME = /^[a-z][a-z0-9_]*_test$/;

class UnsafeTestDatabaseError extends Error {
  constructor(reason) {
    super(`Refusing to run integration tests: ${reason}. See docs/production-readiness-phase-1a-security-remediation.md (Test isolation).`);
    this.name = 'UnsafeTestDatabaseError';
  }
}

const identify = (url, label) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (_error) {
    throw new UnsafeTestDatabaseError(`${label} is not a valid connection URL`);
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new UnsafeTestDatabaseError(`${label} must use the postgresql:// scheme`);
  }
  return {
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  };
};

// Returns the verified identity { host, port, database } — never credentials.
function assertSafeTestDatabase(env = process.env) {
  if (env.NODE_ENV === 'production') throw new UnsafeTestDatabaseError('NODE_ENV is production');
  if (!env.TEST_DATABASE_URL) throw new UnsafeTestDatabaseError('TEST_DATABASE_URL is not set');

  const target = identify(env.TEST_DATABASE_URL, 'TEST_DATABASE_URL');
  if (!target.database) throw new UnsafeTestDatabaseError('TEST_DATABASE_URL has no database name');
  if (RESERVED_DATABASE_NAMES.has(target.database.toLowerCase())) {
    throw new UnsafeTestDatabaseError(`database "${target.database}" is a reserved application/system database`);
  }
  if (!TEST_DATABASE_NAME.test(target.database)) {
    throw new UnsafeTestDatabaseError(`database "${target.database}" is not named as a disposable test database (must end in "_test")`);
  }
  if (env.MEDILINK_INTEGRATION_TEST_DB_CONFIRM !== target.database) {
    throw new UnsafeTestDatabaseError('MEDILINK_INTEGRATION_TEST_DB_CONFIRM must equal the test database name');
  }
  if (env.DATABASE_URL) {
    const app = identify(env.DATABASE_URL, 'DATABASE_URL');
    if (app.host === target.host && app.port === target.port && app.database === target.database) {
      throw new UnsafeTestDatabaseError('TEST_DATABASE_URL points at the same database as DATABASE_URL');
    }
  }
  return target;
}

// Validates, then points this process at the test database. Must run before
// config/prisma is required anywhere in the test process.
function useSafeTestDatabase(env = process.env) {
  const target = assertSafeTestDatabase(env);
  env.DATABASE_URL = env.TEST_DATABASE_URL;
  return target;
}

module.exports = { assertSafeTestDatabase, useSafeTestDatabase, UnsafeTestDatabaseError };

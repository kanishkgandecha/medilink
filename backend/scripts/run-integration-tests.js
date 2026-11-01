#!/usr/bin/env node
'use strict';

// Runs the integration suites against the disposable test database only.
// Configuration comes from backend/.env.test (written by scripts/test-db.js)
// or from TEST_DATABASE_URL / MEDILINK_INTEGRATION_TEST_DB_CONFIRM already in
// the environment (e.g. CI). The guard runs here AND again inside every test
// file before Prisma is loaded. There is no fallback to DATABASE_URL.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(BACKEND, '.env') });
const envTest = path.join(BACKEND, '.env.test');
if (fs.existsSync(envTest)) require('dotenv').config({ path: envTest, override: true });

const { assertSafeTestDatabase } = require('../tests-integration/support/databaseGuard');
let target;
try {
  target = assertSafeTestDatabase(process.env);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`integration: target host=${target.host} port=${target.port} database=${target.database}`);

const files = fs.readdirSync(path.join(BACKEND, 'tests-integration'))
  .filter((name) => name.endsWith('.test.js'))
  .map((name) => path.join('tests-integration', name));
const extra = process.argv.slice(2);

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...(extra.length ? extra : files)], {
  cwd: BACKEND,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    // The matrix suites make well over 500 requests from one IP; the general
    // limiter is configurable for tests only (production default unchanged).
    API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX || '100000',
    // Integration tests never call the external AI provider: they exercise the
    // deterministic fallback and mocked-provider paths only.
    OPENROUTER_API_KEY: '',
    // No outbound email from tests.
    EMAIL_USER: '', EMAIL_PASS: '', EMAIL_HOST: '',
  },
});
process.exit(result.status === null ? 1 : result.status);

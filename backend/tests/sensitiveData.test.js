'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  SENSITIVE_FIELD_NAMES, SAFE_USER_SELECT, stripSensitiveFields, findSensitiveFieldPaths,
} = require('../utils/safeUser');
const {
  redactValue, redactUrlPath, safeErrorMeta, REDACTED, REDACTED_CLINICAL,
} = require('../utils/redact');

test('stripSensitiveFields removes credential fields at any depth and keeps intentional login tokens', () => {
  const now = new Date();
  const input = {
    token: 'intentional-login-token',
    user: { id: 'u1', password: 'hash', resetPasswordToken: 'r', resetPasswordExpire: now },
    data: [{ patient: { user: { name: 'Synthetic', password: 'hash2' } } }],
    when: now,
  };
  const output = stripSensitiveFields(input);
  assert.deepEqual(findSensitiveFieldPaths(output), []);
  assert.equal(output.token, 'intentional-login-token');
  assert.equal(output.data[0].patient.user.name, 'Synthetic');
  assert.equal(output.when, now, 'Date instances are preserved');
  assert.equal(input.user.password, 'hash', 'input is not mutated');
});

test('stripSensitiveFields tolerates cycles', () => {
  const node = { id: 1, password: 'x' };
  node.self = node;
  const output = stripSensitiveFields(node);
  assert.equal(output.password, undefined);
});

test('findSensitiveFieldPaths reports every leaked path', () => {
  assert.deepEqual(findSensitiveFieldPaths({ a: [{ password: 1 }], resetPasswordToken: 2 }),
    ['$.a[0].password', '$.resetPasswordToken']);
});

test('SAFE_USER_SELECT never selects a sensitive column', () => {
  for (const field of SENSITIVE_FIELD_NAMES) assert.equal(field in SAFE_USER_SELECT, false, field);
});

// Static regression guard: a full `user: true` include returns the password
// hash and reset token. No controller, route, service, or middleware may use it.
test('no source file includes the full User row', () => {
  const roots = ['controllers', 'routes', 'services', 'middleware', 'utils'].map((dir) => path.join(__dirname, '..', dir));
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) {
        const source = fs.readFileSync(full, 'utf8');
        if (/\buser:\s*true\b/.test(source)) offenders.push(path.relative(path.join(__dirname, '..'), full));
      }
    }
  };
  roots.forEach(walk);
  assert.deepEqual(offenders, []);
});

test('redactValue hides credentials and clinical free text but keeps operational fields', () => {
  const output = redactValue({
    method: 'POST', password: 'p', authorization: 'Bearer abc', apiKey: 'k', jwtSecret: 's',
    symptoms: 'synthetic chest pain', nested: { reportText: 'synthetic report', status: 'ok' },
  });
  assert.equal(output.method, 'POST');
  assert.equal(output.password, REDACTED);
  assert.equal(output.authorization, REDACTED);
  assert.equal(output.apiKey, REDACTED);
  assert.equal(output.jwtSecret, REDACTED);
  assert.equal(output.symptoms, REDACTED_CLINICAL);
  assert.equal(output.nested.reportText, REDACTED_CLINICAL);
  assert.equal(output.nested.status, 'ok');
});

test('redactUrlPath drops query strings and replaces ids and tokens', () => {
  const token = 'a'.repeat(40);
  assert.equal(redactUrlPath(`/api/auth/reset-password/${token}?x=1`), '/api/auth/reset-password/:token');
  assert.equal(redactUrlPath('/api/patients/search?q=Synthetic%20Name'), '/api/patients/search');
  assert.equal(redactUrlPath('/api/patients/123e4567-e89b-42d3-a456-426614174000/medical-records'), '/api/patients/:id/medical-records');
  assert.equal(redactUrlPath('/api/patients/507f1f77bcf86cd799439011'), '/api/patients/:id');
});

test('safeErrorMeta never includes the error message', () => {
  const error = new Error('Invalid `prisma.user.findFirst()` invocation: where { resetPasswordToken: "synthetic" }');
  error.name = 'PrismaClientValidationError';
  const meta = safeErrorMeta(error);
  assert.equal(meta.category, 'database');
  assert.equal(JSON.stringify(meta).includes('synthetic'), false);
});

// ── Error handler response safety ──────────────────────────────────────────
const runErrorHandler = (error, nodeEnv) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  const logger = require('../utils/logger');
  const originalError = logger.error;
  const logged = [];
  logger.error = (message, meta) => logged.push({ message, meta });
  try {
    const errorHandler = require('../middleware/errorHandler');
    let statusCode;
    let body;
    const res = { status(code) { statusCode = code; return this; }, json(payload) { body = payload; return this; } };
    errorHandler(error, { id: 'req-synthetic', originalUrl: '/api/patients/search?q=Synthetic' }, res, () => {});
    return { statusCode, body, logged };
  } finally {
    logger.error = originalError;
    process.env.NODE_ENV = previous;
  }
};

test('raw database errors are never returned to the client, in any environment', () => {
  for (const env of ['production', 'development']) {
    const error = new Error('Invalid prisma invocation with synthetic-clinical-value');
    error.name = 'PrismaClientValidationError';
    const { statusCode, body } = runErrorHandler(error, env);
    assert.equal(statusCode, 500);
    assert.equal(body.message, 'A database error occurred');
    assert.equal(JSON.stringify(body).includes('synthetic-clinical-value'), false);
  }
});

test('production masks 5xx messages and logs no stack or message', () => {
  const error = new Error('internal detail with synthetic-secret');
  const { statusCode, body, logged } = runErrorHandler(error, 'production');
  assert.equal(statusCode, 500);
  assert.equal(body.message, 'Internal server error');
  assert.equal(body.requestId, 'req-synthetic');
  const serialized = JSON.stringify(logged);
  assert.equal(serialized.includes('synthetic-secret'), false);
  assert.equal(serialized.includes('"stack"'), false);
  assert.equal(serialized.includes('Synthetic'), false, 'query string is not logged');
});

test('client errors keep their safe message', () => {
  const error = new Error('Patient profile already exists for this user');
  error.statusCode = 409;
  const { statusCode, body } = runErrorHandler(error, 'production');
  assert.equal(statusCode, 409);
  assert.equal(body.message, 'Patient profile already exists for this user');
});

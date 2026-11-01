'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { allowedOrigins, buildCorsOptions, configuredOrigins } = require('../config/cors');

const decide = (env, origin) => new Promise((resolve) => buildCorsOptions(env).origin(origin, (_err, allowed) => resolve(allowed)));

test('production allows only configured origins (no hard-coded third-party hosts, no localhost)', async () => {
  const env = { NODE_ENV: 'production', FRONTEND_URL: 'https://app.example.invalid/', CORS_ORIGINS: 'https://admin.example.invalid, not a url' };
  assert.deepEqual(allowedOrigins(env), ['https://app.example.invalid', 'https://admin.example.invalid']);
  assert.equal(await decide(env, 'https://app.example.invalid'), true);
  assert.equal(await decide(env, 'https://admin.example.invalid'), true);
  assert.equal(await decide(env, 'http://localhost:3001'), false);
  assert.equal(await decide(env, 'https://medilink-oajt.onrender.com'), false, 'previously hard-coded host is no longer trusted');
  assert.equal(await decide(env, 'https://evil.invalid'), false);
});

test('development allows local dev servers plus configured origins, but not arbitrary origins', async () => {
  const env = { NODE_ENV: 'development', CORS_ORIGINS: 'https://staging.example.invalid' };
  assert.equal(await decide(env, 'http://localhost:3001'), true);
  assert.equal(await decide(env, 'http://127.0.0.1:5173'), true);
  assert.equal(await decide(env, 'https://staging.example.invalid'), true);
  assert.equal(await decide(env, 'https://evil.invalid'), false, 'development no longer reflects any origin');
});

test('requests without an Origin header are not cross-origin and are allowed', async () => {
  assert.equal(await decide({ NODE_ENV: 'production', FRONTEND_URL: 'https://app.example.invalid' }, undefined), true);
});

test('configuredOrigins normalizes URLs and drops invalid entries', () => {
  assert.deepEqual(configuredOrigins({ FRONTEND_URL: 'https://app.example.invalid/path?q=1', CORS_ORIGINS: ' , ftp-bad , https://x.example.invalid:8443/' }),
    ['https://app.example.invalid', 'https://x.example.invalid:8443']);
});

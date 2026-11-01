'use strict';

// Static frontend ↔ backend contract check (no database, no browser).
// Every `api.<method>('<path>')` call in frontend/src must target a route and
// method documented in openapi/catalog.js (which is itself verified against
// the live Express router), and no page may request a page size above the
// server cap (the server would silently truncate the list).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { endpoints } = require('../openapi/catalog');

const FRONTEND_SRC = path.join(__dirname, '..', '..', 'frontend', 'src');
const SERVER_MAX_PAGE_SIZE = 100;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\.(js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

function frontendCalls() {
  const calls = [];
  for (const file of sourceFiles(FRONTEND_SRC)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bapi\.(get|post|put|patch|delete)\(\s*(['"`])(.*?)\2/g)) {
      const raw = match[3].split('?')[0];
      const templated = raw.replace(/\$\{[^}]+\}/g, '{param}');
      calls.push({ method: match[1], path: `/api${templated}`, file: path.relative(FRONTEND_SRC, file) });
    }
  }
  return calls;
}

const segments = (p) => p.replace(/\/$/, '').split('/');
const matchesRoute = (callPath, routePath) => {
  const a = segments(callPath);
  const b = segments(routePath);
  return a.length === b.length && a.every((seg, i) => seg === b[i] || seg === '{param}' || /^\{\w+\}$/.test(b[i]));
};

test('the scanner finds the frontend API surface', () => {
  assert.ok(fs.existsSync(FRONTEND_SRC), 'frontend/src exists next to backend/');
  assert.ok(frontendCalls().length > 100);
});

test('every frontend API call targets an existing backend route and method', () => {
  const mismatches = frontendCalls().filter((call) =>
    !endpoints.some((ep) => ep.method === call.method && matchesRoute(call.path, ep.path)))
    .map((call) => `${call.method.toUpperCase()} ${call.path} (${call.file})`);
  assert.deepEqual(mismatches, []);
});

test('no frontend call requests a page size the server would clamp', () => {
  const offenders = [];
  for (const file of sourceFiles(FRONTEND_SRC)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\blimit:\s*(\d+)/g)) {
      if (Number(match[1]) > SERVER_MAX_PAGE_SIZE) offenders.push(`${path.relative(FRONTEND_SRC, file)}: limit ${match[1]}`);
    }
  }
  assert.deepEqual(offenders, [], 'use fetchAllPages() from services/pagination.js for complete lists');
});

test('backend routes without a frontend caller are reported (informational, documented in Phase 1B)', () => {
  const calls = frontendCalls();
  const unused = endpoints.filter((ep) => ep.path.startsWith('/api/')
    && !calls.some((call) => call.method === ep.method && matchesRoute(call.path, ep.path)));
  // Not a failure: several backend capabilities have no UI yet. The list is
  // asserted to stay bounded so newly orphaned routes are noticed.
  assert.ok(unused.length <= 25, `unexpectedly many backend routes without a frontend caller: ${unused.length}`);
});

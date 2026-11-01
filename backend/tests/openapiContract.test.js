'use strict';

// OpenAPI contract tests (no database). Fails when:
//  - the generated spec is invalid or contains forbidden content,
//  - openapi/openapi.json is stale relative to openapi/catalog.js,
//  - a backend route exists without a spec entry, or vice versa.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSpec } = require('../openapi/build');
const { validateOpenApi } = require('../openapi/validate');
const { endpoints } = require('../openapi/catalog');

const BACKEND = path.join(__dirname, '..');

test('the generated OpenAPI 3.1 document is valid and documents 120 operations', () => {
  const spec = buildSpec();
  assert.deepEqual(validateOpenApi(spec), []);
  const operations = Object.values(spec.paths).reduce((sum, item) => sum + Object.keys(item).length, 0);
  assert.equal(operations, 120);
  assert.equal(endpoints.length, 120);
});

test('the committed openapi/openapi.json matches the catalog (no silent drift)', () => {
  const committed = fs.readFileSync(path.join(BACKEND, 'openapi', 'openapi.json'), 'utf8');
  assert.equal(committed, `${JSON.stringify(buildSpec(), null, 2)}\n`, 'run: npm run openapi:build');
});

// Enumerates the real Express routes: server-level routes plus every router
// mounted in server.js (mount prefixes are read from the app.use() calls).
function liveRoutes() {
  const serverSource = fs.readFileSync(path.join(BACKEND, 'server.js'), 'utf8');
  const requires = Object.fromEntries([...serverSource.matchAll(/const (\w+) = require\('\.\/routes\/(\w+)'\);/g)].map((m) => [m[1], m[2]]));
  const mounts = [...serverSource.matchAll(/app\.use\('(\/api\/[\w-]+)', (\w+)\);/g)].map((m) => ({ prefix: m[1], file: requires[m[2]] }));
  assert.ok(mounts.length >= 12, 'expected all API routers to be mounted');

  const routes = new Set();
  const toOpenApi = (p) => p.replace(/:(\w+)/g, '{$1}').replace(/\/$/, '') || '/';
  for (const { prefix, file } of mounts) {
    const router = require(path.join(BACKEND, 'routes', file));
    for (const layer of router.stack) {
      if (!layer.route) continue;
      for (const method of Object.keys(layer.route.methods)) {
        routes.add(`${method.toUpperCase()} ${toOpenApi(prefix + (layer.route.path === '/' ? '' : layer.route.path))}`);
      }
    }
  }
  for (const m of serverSource.matchAll(/app\.get\('([^']+)'/g)) routes.add(`GET ${m[1]}`);
  return routes;
}

test('every live Express route has exactly one spec entry and vice versa', () => {
  process.env.NODE_ENV = 'test';
  const live = liveRoutes();
  const documented = new Set(endpoints.map((ep) => `${ep.method.toUpperCase()} ${ep.path}`));
  const undocumented = [...live].filter((route) => !documented.has(route));
  const phantom = [...documented].filter((route) => !live.has(route));
  assert.deepEqual(undocumented, [], 'routes missing from openapi/catalog.js');
  assert.deepEqual(phantom, [], 'catalog entries with no backing route');
  assert.equal(live.size, 120);
});

test('state-changing flags match HTTP semantics except documented read-only POSTs', () => {
  const readOnlyPosts = new Set(['/api/auth/login', '/api/ai/chat', '/api/ai/symptom-analysis', '/api/ai/report-analysis',
    '/api/ai/health-risk', '/api/ai/bed-allocation', '/api/ai/appointment-optimizer', '/api/ai/symptom-to-appointment']);
  for (const ep of endpoints) {
    if (ep.method === 'get') assert.equal(ep.state, 'read', `${ep.path} GET must be read-only`);
    else if (readOnlyPosts.has(ep.path)) assert.equal(ep.state, 'read', ep.path);
    else assert.equal(ep.state, 'write', `${ep.method} ${ep.path}`);
  }
});

// ── Negative tests: the validator must catch malformed or unsafe changes ──
const clone = () => JSON.parse(JSON.stringify(buildSpec()));

test('validator rejects an undeclared path parameter', () => {
  const doc = clone();
  doc.paths['/api/patients/{id}'].get.parameters = [];
  assert.ok(validateOpenApi(doc).some((p) => p.includes('path parameter {id} is not declared')));
});

test('validator rejects unresolved $refs, duplicate operationIds, and unknown roles', () => {
  const doc = clone();
  doc.paths['/api/auth/me'].get.responses['200'].content['application/json'].schema = { $ref: '#/components/schemas/Missing' };
  doc.paths['/api/auth/verify'].get.operationId = doc.paths['/api/auth/me'].get.operationId;
  doc.paths['/api/staff'].get['x-roles'] = ['superuser'];
  const problems = validateOpenApi(doc);
  assert.ok(problems.some((p) => p.includes('unresolved $ref')));
  assert.ok(problems.some((p) => p.includes('duplicate operationId')));
  assert.ok(problems.some((p) => p.includes('unknown role "superuser"')));
});

test('validator rejects protected operations without security or 401', () => {
  const doc = clone();
  delete doc.paths['/api/staff'].get.security;
  delete doc.paths['/api/staff'].get.responses['401'];
  const problems = validateOpenApi(doc);
  assert.ok(problems.some((p) => p.includes('must declare security')));
  assert.ok(problems.some((p) => p.includes('must document 401')));
});

test('validator rejects secrets, demo credentials, and internal paths in the document', () => {
  const planted = [
    'Password123!', 'sk-or-v1-abcdef123456', 'postgresql://user:pw@db/x',
    'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMzQ1Njc4OTAifQ.sig', '/Users/someone/app', 'private-uploads/report-attachments', 'admin@medilink.com',
  ];
  for (const value of planted) {
    const doc = clone();
    doc.info.description += ` ${value}`;
    assert.ok(validateOpenApi(doc).some((p) => p.includes('forbidden content')), `should reject: ${value.slice(0, 12)}…`);
  }
});

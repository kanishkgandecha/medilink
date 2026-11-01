'use strict';

// /health must report 503 (not crash, not leak connection details) when the
// database round trip fails. Uses the fake data layer; no database needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { bootFakeApp, listen } = require('./support/fakePrismaApp');

const admin = { id: '11111111-1111-4111-8111-111111111111', legacyMongoId: null, name: 'Synthetic Admin', email: 'a@synthetic.invalid', role: 'Admin', subRole: null, isActive: true };
const state = { users: [admin], patients: [], doctors: [], appointments: [], prescriptions: [], beds: [], failQueryRaw: false, failModels: [] };
const { app, tokenFor } = bootFakeApp(state);
let http;
test.before(async () => { http = await listen(app); });
test.after(async () => { await http.close(); });

test('health is 200 when the database responds and 503 without internal details when it does not', async () => {
  assert.equal((await http.request('/health')).status, 200);
  state.failQueryRaw = true;
  const down = await http.request('/health');
  assert.equal(down.status, 503);
  assert.equal(down.json.status, 'unavailable');
  assert.equal(down.text.includes('db.internal'), false);
});

test('AI reliability reports 503 (no internal detail) when audit storage is unavailable', async () => {
  state.failModels = ['aiAuditEvent'];
  const res = await http.request('/api/ai/reliability', { token: tokenFor(admin) });
  assert.equal(res.status, 503);
  assert.equal(res.text.includes('synthetic storage failure'), false);
  state.failModels = [];
});

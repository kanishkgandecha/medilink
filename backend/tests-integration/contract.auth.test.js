'use strict';

// Auth contract: registration, login, password reset (captured email),
// password change, profile, and avatar upload. Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const h = createHarness('auth');
test.before(() => h.start());
test.after(() => h.stop());

const syntheticEmail = () => `integration-auth-${h.tag()}@medilink.invalid`;
const STRONG = 'Synthetic-Pass-2026';

test('register: validation, success, duplicate, and safe response', async () => {
  const invalid = [
    [{ email: syntheticEmail(), password: STRONG, phone: '1' }, 'name'],
    [{ name: 'X', email: 'not-an-email', password: STRONG, phone: '1' }, 'email'],
    [{ name: 'X', email: syntheticEmail(), password: '123', phone: '1' }, 'password'],
    [{ name: 'X', email: syntheticEmail(), password: STRONG, phone: '1', gender: 'Unknown' }, 'gender'],
    [{ name: 'X', email: syntheticEmail(), password: STRONG, phone: '1', dateOfBirth: 'not-a-date' }, 'dateOfBirth'],
  ];
  for (const [body, field] of invalid) {
    const res = await h.request('/api/auth/register', { method: 'POST', body });
    assert.equal(res.status, 400, `invalid ${field}`);
    assert.ok(res.json.errors.some((e) => e.path === field), `error names ${field}`);
    assert.ok(res.json.errors.every((e) => !('value' in e)), 'validation errors never echo values');
  }

  const email = syntheticEmail();
  const created = await h.request('/api/auth/register', { method: 'POST', body: { name: 'Synthetic Registrant', email, password: STRONG, phone: `IT-${h.tag()}` } });
  assert.equal(created.status, 201);
  h.trackUser(created.json.user.id);
  assert.equal(created.json.user.role, 'Patient');
  assert.ok(created.json.token);
  assert.deepEqual(h.findSensitiveFieldPaths(created.json), []);
  assert.ok(await h.prisma.patient.findUnique({ where: { userId: created.json.user.id } }), 'patient profile created atomically');

  const duplicate = await h.request('/api/auth/register', { method: 'POST', body: { name: 'Dup', email, password: STRONG, phone: '2' } });
  assert.equal(duplicate.status, 409);
});

test('login: success, wrong password, unknown account, inactive account, validation', async () => {
  const password = STRONG;
  const { user } = await h.createUser('login', 'Patient', null, { password: await bcrypt.hash(password, 10) });
  const ok = await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  assert.deepEqual(h.findSensitiveFieldPaths(ok.json), []);

  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Wrong-Pass-1' } })).status, 401);
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: syntheticEmail(), password } })).status, 401);
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: 'bad', password } })).status, 400);

  const { user: inactive } = await h.createUser('login-inactive', 'Patient', null, { password: await bcrypt.hash(password, 10), isActive: false });
  const denied = await h.request('/api/auth/login', { method: 'POST', body: { email: inactive.email, password } });
  assert.equal(denied.status, 401);
  assert.match(denied.json.message, /deactivated/i);
});

test('forgot/reset password: generic response, hashed single-use token, complexity, and expiry', async () => {
  const { user } = await h.createUser('reset', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });

  const unknown = await h.request('/api/auth/forgot-password', { method: 'POST', body: { email: syntheticEmail() } });
  const known = await h.request('/api/auth/forgot-password', { method: 'POST', body: { email: user.email } });
  assert.equal(unknown.status, 200);
  assert.equal(known.status, 200);
  assert.equal(unknown.json.message, known.json.message, 'no account enumeration');

  const mail = h.sentMail.find((message) => message.to === user.email);
  assert.ok(mail, 'reset email captured (not sent)');
  const rawToken = (mail.text.match(/reset-password\/([a-f0-9]{40})/) || [])[1];
  assert.ok(rawToken);
  const stored = await h.prisma.user.findUnique({ where: { id: user.id }, select: { resetPasswordToken: true } });
  assert.notEqual(stored.resetPasswordToken, rawToken, 'only a hash is stored');
  assert.equal(stored.resetPasswordToken, crypto.createHash('sha256').update(rawToken).digest('hex'));

  assert.equal((await h.request(`/api/auth/reset-password/${rawToken}`, { method: 'POST', body: { password: 'weakpass' } })).status, 400);
  assert.equal((await h.request(`/api/auth/reset-password/${'0'.repeat(40)}`, { method: 'POST', body: { password: 'Another-Pass-2026' } })).status, 400);

  const reset = await h.request(`/api/auth/reset-password/${rawToken}`, { method: 'POST', body: { password: 'Another-Pass-2026' } });
  assert.equal(reset.status, 200);
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Another-Pass-2026' } })).status, 200);
  assert.equal((await h.request(`/api/auth/reset-password/${rawToken}`, { method: 'POST', body: { password: 'Third-Pass-2026' } })).status, 400, 'token is single-use');

  await h.request('/api/auth/forgot-password', { method: 'POST', body: { email: user.email } });
  const second = h.sentMail.filter((message) => message.to === user.email).pop();
  const expiredToken = second.text.match(/reset-password\/([a-f0-9]{40})/)[1];
  await h.prisma.user.update({ where: { id: user.id }, data: { resetPasswordExpire: new Date(Date.now() - 1000) } });
  assert.equal((await h.request(`/api/auth/reset-password/${expiredToken}`, { method: 'POST', body: { password: 'Fourth-Pass-2026' } })).status, 400, 'expired token rejected');
});

test('update-password: wrong current password, weak new password, and success', async () => {
  const principal = await h.createUser('change-password', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  const wrong = await h.request('/api/auth/update-password', { token: principal.token, method: 'PUT', body: { currentPassword: 'Nope-1234', newPassword: 'Newer-Pass-2026' } });
  assert.equal(wrong.status, 401);
  const weak = await h.request('/api/auth/update-password', { token: principal.token, method: 'PUT', body: { currentPassword: STRONG, newPassword: 'short' } });
  assert.equal(weak.status, 400);
  const ok = await h.request('/api/auth/update-password', { token: principal.token, method: 'PUT', body: { currentPassword: STRONG, newPassword: 'Newer-Pass-2026' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: principal.user.email, password: STRONG } })).status, 401, 'old password no longer works');
});

test('verify, me, and my-profile return safe user data only', async () => {
  const patient = await h.createPatient('profile-reader');
  for (const url of ['/api/auth/verify', '/api/auth/me', '/api/auth/my-profile']) {
    const res = await h.request(url, { token: patient.token });
    assert.equal(res.status, 200, url);
    assert.deepEqual(h.findSensitiveFieldPaths(res.json), [], url);
  }
});

test('profile update: validation and success', async () => {
  const principal = await h.createUser('profile', 'Patient');
  const invalid = [{ gender: 'Unknown' }, { dateOfBirth: 'not-a-date' }, { name: '' }, { address: 'not-an-object' }, { avatar: 'https://external.invalid/x.png' }];
  for (const body of invalid) {
    const res = await h.request('/api/auth/profile', { token: principal.token, method: 'PUT', body });
    assert.equal(res.status, 400, `invalid profile ${JSON.stringify(body)}`);
  }
  const ok = await h.request('/api/auth/profile', { token: principal.token, method: 'PUT', body: { name: 'Synthetic Renamed', gender: 'Other', address: { city: 'Synthetic City' } } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.name, 'Synthetic Renamed');
  assert.equal(ok.json.user.address.city, 'Synthetic City');
  // The Profile page stores colour-preset keys in the avatar field.
  const preset = await h.request('/api/auth/profile', { token: principal.token, method: 'PUT', body: { avatar: 'emerald' } });
  assert.equal(preset.status, 200);
  assert.equal(preset.json.user.avatar, 'emerald');
});

test('avatar upload: accepted image, spoofed content, wrong type, oversize, and missing file', async () => {
  const principal = await h.createUser('avatar', 'Patient');
  const ok = await h.upload('/api/auth/avatar', { token: principal.token, field: 'avatar', filename: 'synthetic.png', mimetype: 'image/png', buffer: h.PNG_BYTES });
  assert.equal(ok.status, 200);
  assert.match(ok.json.avatarUrl, /^\/uploads\/avatars\//);
  const stored = path.join(h.AVATAR_DIR, path.basename(ok.json.avatarUrl));
  assert.ok(fs.existsSync(stored));
  h.trackFile(stored);

  const spoofed = await h.upload('/api/auth/avatar', { token: principal.token, field: 'avatar', filename: 'fake.png', mimetype: 'image/png', buffer: Buffer.from('not an image') });
  assert.equal(spoofed.status, 400);
  const wrongType = await h.upload('/api/auth/avatar', { token: principal.token, field: 'avatar', filename: 'doc.pdf', mimetype: 'application/pdf', buffer: h.PDF_BYTES });
  assert.equal(wrongType.status, 400);
  const mismatch = await h.upload('/api/auth/avatar', { token: principal.token, field: 'avatar', filename: 'image.png', mimetype: 'image/jpeg', buffer: h.PNG_BYTES });
  assert.equal(mismatch.status, 400, 'extension/MIME mismatch rejected');
  const oversized = await h.upload('/api/auth/avatar', { token: principal.token, field: 'avatar', filename: 'big.png', mimetype: 'image/png', buffer: Buffer.concat([h.PNG_BYTES, Buffer.alloc(2 * 1024 * 1024 + 1)]) });
  assert.equal(oversized.status, 400);
  const missing = await h.upload('/api/auth/avatar', { token: principal.token, field: 'avatar', buffer: null });
  assert.equal(missing.status, 400);
});

// ── Phase 2: session revocation, lockout, password policy, body limit, CORS ──
test('logout revokes every token issued to the account (all devices)', async () => {
  const { user } = await h.createUser('logout', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  const login = async () => (await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: STRONG } })).json.token;
  const deviceA = await login();
  const deviceB = await login();
  assert.equal((await h.request('/api/auth/verify', { token: deviceB })).status, 200);
  assert.equal((await h.request('/api/auth/logout', { token: deviceA, method: 'POST' })).status, 200);
  assert.equal((await h.request('/api/auth/verify', { token: deviceA })).status, 401);
  assert.equal((await h.request('/api/auth/verify', { token: deviceB })).status, 401, 'other devices are signed out too');
  assert.equal((await h.request('/api/auth/verify', { token: await login() })).status, 200, 'a new login works');
});

test('password change revokes other sessions; the returned token keeps working', async () => {
  const { user } = await h.createUser('revoke-change', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  const old = (await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: STRONG } })).json.token;
  const changed = await h.request('/api/auth/update-password', { token: old, method: 'PUT', body: { currentPassword: STRONG, newPassword: 'Changed-Pass-2026' } });
  assert.equal(changed.status, 200);
  assert.equal((await h.request('/api/auth/verify', { token: old })).status, 401);
  assert.equal((await h.request('/api/auth/verify', { token: changed.json.token })).status, 200);
});

test('password reset revokes existing sessions and lifts a lockout', async () => {
  const { user } = await h.createUser('revoke-reset', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  const old = (await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: STRONG } })).json.token;
  await h.prisma.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 600000) } });
  await h.request('/api/auth/forgot-password', { method: 'POST', body: { email: user.email } });
  const raw = h.sentMail.filter((m) => m.to === user.email).pop().text.match(/reset-password\/([a-f0-9]{40})/)[1];
  assert.equal((await h.request(`/api/auth/reset-password/${raw}`, { method: 'POST', body: { password: 'Reset-Pass-2026' } })).status, 200);
  assert.equal((await h.request('/api/auth/verify', { token: old })).status, 401);
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Reset-Pass-2026' } })).status, 200, 'lockout lifted');
});

test('login lockout: 5 wrong passwords lock the account, even for the right password, until it expires', async () => {
  const { user } = await h.createUser('lockout', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  const attempt = (password) => h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password } });
  for (let i = 1; i <= 4; i += 1) assert.equal((await attempt('Wrong-Pass-0000')).status, 401, `attempt ${i}`);
  const fifth = await attempt('Wrong-Pass-0000');
  assert.equal(fifth.status, 429);
  assert.equal(fifth.json.code, 'ACCOUNT_LOCKED');
  assert.equal((await attempt(STRONG)).status, 429, 'correct password is refused while locked');

  await h.prisma.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
  assert.equal((await attempt(STRONG)).status, 200, 'unlocks after expiry');
  const row = await h.prisma.user.findUnique({ where: { id: user.id }, select: { failedLoginCount: true, lockedUntil: true } });
  assert.equal(row.failedLoginCount, 0);
  assert.equal(row.lockedUntil, null);
});

test('a successful login resets the failure counter', async () => {
  const { user } = await h.createUser('counter', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  for (let i = 0; i < 3; i += 1) await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Wrong-Pass-0000' } });
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: STRONG } })).status, 200);
  for (let i = 0; i < 4; i += 1) assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'Wrong-Pass-0000' } })).status, 401);
});

test('registration enforces the same password policy as reset and change', async () => {
  for (const password of ['short1A', 'nouppercase1', 'NOLOWERCASE1', 'NoDigitsHere']) {
    const res = await h.request('/api/auth/register', { method: 'POST', body: { name: 'X', email: `integration-auth-${h.tag()}@medilink.invalid`, password, phone: '1' } });
    assert.equal(res.status, 400, password);
  }
});

test('request bodies above 1 MB are rejected with 413', async () => {
  const res = await h.request('/api/auth/login', { method: 'POST', body: { email: 'x@medilink.invalid', password: 'x'.repeat(1100 * 1024) } });
  assert.equal(res.status, 413);
});

test('CORS: local dev origins receive CORS headers; arbitrary origins do not', async () => {
  const allowed = await h.request('/health', { headers: { Origin: 'http://localhost:3001' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:3001');
  const denied = await h.request('/health', { headers: { Origin: 'https://evil.invalid' } });
  assert.equal(denied.status, 200, 'not turned into a server error');
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('new account-security fields never appear in responses', async () => {
  const principal = await h.createUser('fields', 'Patient');
  for (const url of ['/api/auth/me', '/api/auth/verify', '/api/auth/my-profile']) {
    const res = await h.request(url, { token: principal.token });
    for (const key of ['tokenVersion', 'failedLoginCount', 'lockedUntil']) assert.equal(JSON.stringify(res.json).includes(`"${key}"`), false, `${url} leaks ${key}`);
  }
});

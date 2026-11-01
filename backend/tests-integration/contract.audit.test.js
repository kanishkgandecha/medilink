'use strict';

// Phase 3 audit trail and privacy contracts: PHI reads, denials, auth events,
// billing/prescription/appointment events, the Admin audit query endpoint,
// metadata safety, and private avatar delivery. Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const h = createHarness('audit');
const P = {};
const STRONG = 'Synthetic-Pass-2026';

test.before(async () => {
  await h.start();
  P.admin = await h.createUser('admin', 'Admin');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.billing = await h.createUser('billing', 'Staff', 'BillingStaff');
  P.doctor = await h.createDoctor('doctor');
  P.unrelatedDoctor = await h.createDoctor('unrelated-doctor');
  P.patient = await h.createPatient('patient', { allergies: ['Synthetic allergen'] });
  P.appointment = await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
});
test.after(() => h.stop());

// Audit writes complete after the response; wait for them before asserting.
const eventsFor = async (where) => {
  await new Promise((resolve) => setTimeout(resolve, 30));
  await h.flushAudits();
  return h.prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'asc' } });
};

test('a PHI read is recorded with actor, role, patient, outcome, and the response request ID', async () => {
  const res = await h.request(`/api/patients/${P.patient.profile.id}/medical-records`, { token: P.doctor.token });
  assert.equal(res.status, 200);
  const [event] = await eventsFor({ action: 'MEDICAL_RECORDS_VIEWED', actorId: P.doctor.user.id });
  assert.ok(event);
  assert.equal(event.outcome, 'success');
  assert.equal(event.actorRole, 'Doctor');
  assert.equal(event.patientId, P.patient.profile.id);
  assert.equal(event.requestId, res.headers.get('x-request-id'));
});

test('authorization refusals on patient records are recorded as denied', async () => {
  const res = await h.request(`/api/patients/${P.patient.profile.id}`, { token: P.unrelatedDoctor.token });
  assert.equal(res.status, 403);
  const [event] = await eventsFor({ action: 'PATIENT_VIEWED', actorId: P.unrelatedDoctor.user.id });
  assert.equal(event.outcome, 'denied');
});

test('attachment downloads and AI patient summaries are recorded', async () => {
  const report = await h.prisma.labReport.create({ data: { patientId: P.patient.profile.id, testName: 'Synthetic CBC', testType: 'Blood Test' } });
  assert.equal((await h.upload(`/api/patients/${P.patient.profile.id}/lab-report/${report.id}/attachment`, { token: P.doctor.token })).status, 200);
  assert.equal((await h.request(`/api/patients/${P.patient.profile.id}/lab-report/${report.id}/attachment`, { token: P.patient.token })).status, 200);
  assert.equal((await h.request(`/api/ai/patient-summary/${P.patient.profile.id}`, { token: P.patient.token })).status, 200);
  const events = await eventsFor({ patientId: P.patient.profile.id, action: { in: ['ATTACHMENT_UPLOADED', 'ATTACHMENT_DOWNLOADED', 'AI_PATIENT_SUMMARY_VIEWED'] } });
  assert.deepEqual(new Set(events.map((e) => e.action)), new Set(['ATTACHMENT_UPLOADED', 'ATTACHMENT_DOWNLOADED', 'AI_PATIENT_SUMMARY_VIEWED']));
  assert.ok(events.find((e) => e.action === 'ATTACHMENT_DOWNLOADED' && e.actorId === P.patient.user.id && e.resourceId === report.id));
});

test('authentication events: success, failure, lockout, blocked attempt, password change, logout', async () => {
  const { user } = await h.createUser('auth-events', 'Patient', null, { password: await bcrypt.hash(STRONG, 10) });
  const login = (password) => h.request('/api/auth/login', { method: 'POST', body: { email: user.email, password } });
  const ok = await login(STRONG);
  assert.equal(ok.status, 200);
  for (let i = 0; i < 5; i += 1) await login('Wrong-Pass-0000');
  assert.equal((await login(STRONG)).status, 429);
  await h.prisma.user.update({ where: { id: user.id }, data: { lockedUntil: null } });
  const fresh = (await login(STRONG)).json.token;
  await h.request('/api/auth/update-password', { token: fresh, method: 'PUT', body: { currentPassword: 'Wrong-Pass-0000', newPassword: 'Changed-Pass-2026' } });
  const changed = await h.request('/api/auth/update-password', { token: fresh, method: 'PUT', body: { currentPassword: STRONG, newPassword: 'Changed-Pass-2026' } });
  await h.request('/api/auth/logout', { token: changed.json.token, method: 'POST' });

  const actions = (await eventsFor({ actorId: user.id })).map((e) => `${e.action}:${e.outcome}`);
  for (const expected of ['LOGIN_SUCCEEDED:success', 'LOGIN_FAILED:failure', 'ACCOUNT_LOCKED:failure', 'LOGIN_BLOCKED_LOCKED:denied',
    'PASSWORD_CHANGE_FAILED:failure', 'PASSWORD_CHANGED:success', 'LOGGED_OUT:success']) {
    assert.ok(actions.includes(expected), `missing ${expected} in ${actions.join(', ')}`);
  }
  assert.equal(actions.filter((a) => a === 'LOGIN_FAILED:failure').length, 4, 'the fifth failure is recorded as the lock');
});

test('unknown accounts do not create audit rows (no enumeration trail keyed by email)', async () => {
  const before = await h.prisma.auditEvent.count();
  await h.request('/api/auth/login', { method: 'POST', body: { email: `nobody-${h.tag()}@medilink.invalid`, password: STRONG } });
  await h.request('/api/auth/forgot-password', { method: 'POST', body: { email: `nobody-${h.tag()}@medilink.invalid` } });
  await h.flushAudits();
  assert.equal(await h.prisma.auditEvent.count(), before);
});

test('billing, prescription, and appointment changes are recorded with allow-listed metadata only', async () => {
  const bill = (await h.request('/api/billing', { token: P.billing.token, method: 'POST', body: { patient: P.patient.user.id, items: [{ description: 'Synthetic consult', unitPrice: 100, quantity: 1 }], notes: 'free-text note that must not be audited' } })).json.bill;
  await h.request(`/api/billing/${bill.id}/payment`, { token: P.billing.token, method: 'POST', body: { amount: 40, paymentMethod: 'UPI', notes: 'free text' } });
  const med = await h.createMedicine({ stockQuantity: 10 });
  const rx = (await h.request('/api/prescriptions', { token: P.doctor.token, method: 'POST', body: { patient: P.patient.profile.id, medicines: [{ medicine: med.id, quantity: 2, dosage: '1', frequency: 'Daily', duration: '2 days' }], diagnosis: 'synthetic diagnosis text' } })).json.data;
  await h.request(`/api/prescriptions/${rx.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: crypto.randomUUID(), items: [{ medicineId: med.id, dispensedQuantity: 2 }] } });
  await h.request(`/api/appointments/${P.appointment.id}`, { token: P.doctor.token, method: 'PUT', body: { status: 'Confirmed', notes: 'synthetic clinical notes' } });

  const events = await eventsFor({ patientId: P.patient.profile.id, action: { in: ['BILL_CREATED', 'PAYMENT_RECORDED', 'PRESCRIPTION_CREATED', 'PRESCRIPTION_DISPENSED', 'APPOINTMENT_UPDATED'] } });
  const byAction = Object.fromEntries(events.map((e) => [e.action, e]));
  assert.deepEqual(Object.keys(byAction).sort(), ['APPOINTMENT_UPDATED', 'BILL_CREATED', 'PAYMENT_RECORDED', 'PRESCRIPTION_CREATED', 'PRESCRIPTION_DISPENSED']);
  assert.deepEqual(byAction.PAYMENT_RECORDED.metadata, { amount: 40, paymentMethod: 'UPI' });
  assert.equal(byAction.BILL_CREATED.metadata.totalAmount, 100);
  assert.equal(byAction.PRESCRIPTION_DISPENSED.metadata.itemCount, 1);
  assert.equal(byAction.APPOINTMENT_UPDATED.metadata.toStatus, 'Confirmed');
  const serialized = JSON.stringify(events);
  for (const text of ['free-text note', 'synthetic diagnosis text', 'synthetic clinical notes', 'free text']) {
    assert.equal(serialized.includes(text), false, `audit must not contain "${text}"`);
  }
});

test('Admin audit query: filters, pagination, validation, and the query itself is audited', async () => {
  const res = await h.request(`/api/audit-events?patientId=${P.patient.profile.id}&limit=5`, { token: P.admin.token });
  assert.equal(res.status, 200);
  assert.ok(res.json.total >= 1);
  assert.ok(res.json.data.length <= 5);
  assert.ok(res.json.data.every((e) => e.patientId === P.patient.profile.id));
  assert.deepEqual(h.findSensitiveFieldPaths(res.json), []);
  const filtered = await h.request('/api/audit-events?action=PATIENT_VIEWED&outcome=denied', { token: P.admin.token });
  assert.ok(filtered.json.data.every((e) => e.action === 'PATIENT_VIEWED' && e.outcome === 'denied'));
  for (const bad of ['action=drop table', 'outcome=maybe', 'from=yesterday']) {
    assert.equal((await h.request(`/api/audit-events?${bad}`, { token: P.admin.token })).status, 400, bad);
  }
  assert.equal((await h.request('/api/audit-events', { token: P.doctor.token })).status, 403);
  const meta = await eventsFor({ action: 'AUDIT_LOG_VIEWED', actorId: P.admin.user.id });
  assert.ok(meta.length >= 1);
});

test('avatars are private: served only to their owner through the API, never as a static file', async () => {
  const owner = await h.createUser('avatar-owner', 'Patient');
  const other = await h.createUser('avatar-other', 'Patient');
  const uploaded = await h.upload('/api/auth/avatar', { token: owner.token, field: 'avatar', filename: 'me.png', mimetype: 'image/png', buffer: h.PNG_BYTES });
  assert.equal(uploaded.status, 200);
  assert.doesNotMatch(uploaded.json.avatarUrl, new RegExp(owner.user.id), 'filename no longer embeds the user ID');
  const mine = await h.request('/api/auth/avatar', { token: owner.token });
  assert.equal(mine.status, 200);
  assert.equal(mine.headers.get('content-type'), 'image/png');
  assert.ok(mine.buffer.equals(h.PNG_BYTES));
  assert.equal((await h.request(uploaded.json.avatarUrl)).status, 404, 'no public static route');
  assert.equal((await h.request('/api/auth/avatar')).status, 401);
  assert.equal((await h.request('/api/auth/avatar', { token: other.token })).status, 404, 'other users get their own (absent) avatar, never this one');
});

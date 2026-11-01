'use strict';

// Staff and doctor lifecycle, reports, dashboards, and AI patient-safety
// contracts. Synthetic data only; no external AI provider is contacted.

const { createHarness } = require('./support/harness');
process.env.AI_REQUESTS_PER_MINUTE = '1000';
const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

const h = createHarness('staff-doctors');
const P = {};
test.before(async () => {
  await h.start();
  P.admin = await h.createUser('admin', 'Admin');
  P.receptionist = await h.createUser('receptionist', 'Staff', 'Receptionist');
  P.nurse = await h.createUser('nurse', 'Staff', 'Nurse');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.doctor = await h.createDoctor('doctor');
  P.patient = await h.createPatient('patient');
});
test.after(() => h.stop());

const staffBody = (overrides = {}) => ({
  name: 'Synthetic Staff', email: `integration-s-${h.tag()}@medilink.invalid`, phone: `IT-${h.tag()}`, subRole: 'Nurse', department: 'Integration Department', ...overrides,
});

test('staff creation: validation, duplicates, safe response, and account linkage', async () => {
  const bad = [{ subRole: 'Janitor' }, { department: '' }, { email: 'bad' }, { employmentType: 'Seasonal' }, { shift: 'Midday' }, { salary: { basic: -1 } }];
  for (const overrides of bad) assert.equal((await h.request('/api/staff', { token: P.admin.token, method: 'POST', body: staffBody(overrides) })).status, 400, JSON.stringify(overrides));
  const body = staffBody();
  const created = await h.request('/api/staff', { token: P.admin.token, method: 'POST', body });
  assert.equal(created.status, 201);
  h.trackUser(created.json.data.userId._id);
  assert.deepEqual(h.findSensitiveFieldPaths(created.json), []);
  const user = await h.prisma.user.findUnique({ where: { id: created.json.data.userId._id } });
  assert.equal(user.role, 'Staff');
  assert.equal(user.subRole, 'Nurse');
  assert.equal((await h.request('/api/staff', { token: P.admin.token, method: 'POST', body: { ...staffBody(), email: body.email } })).status, 409);
});

test('staff update, performance, listing, and soft deactivation that blocks login', async () => {
  const password = 'Synthetic-Pass-2026';
  const created = await h.request('/api/staff', { token: P.admin.token, method: 'POST', body: staffBody({ subRole: 'Pharmacist' }) });
  h.trackUser(created.json.data.userId._id);
  const id = created.json.data.id;
  await h.prisma.user.update({ where: { id: created.json.data.userId._id }, data: { password: await bcrypt.hash(password, 10) } });

  assert.equal((await h.request(`/api/staff/${id}`, { token: P.admin.token, method: 'PUT', body: { shift: 'Midday' } })).status, 400);
  assert.equal((await h.request(`/api/staff/${id}`, { token: P.admin.token, method: 'PUT', body: { shift: 'Night', designation: 'Senior Pharmacist' } })).json.data.shift, 'Night');
  assert.equal((await h.request(`/api/staff/${id}/performance`, { token: P.admin.token, method: 'PUT', body: { rating: 6 } })).status, 400);
  assert.equal((await h.request(`/api/staff/${id}/performance`, { token: P.admin.token, method: 'PUT', body: { rating: 4.5 } })).json.data.performance.rating, 4.5);
  const department = await h.request('/api/staff/department/Integration%20Department', { token: P.admin.token });
  assert.ok(department.json.data.some((s) => s.id === id));
  assert.equal((await h.request('/api/staff/stats', { token: P.admin.token })).status, 200);
  assert.equal((await h.request('/api/staff/available-users', { token: P.admin.token })).status, 200);

  assert.equal((await h.request(`/api/staff/${id}`, { token: P.admin.token, method: 'DELETE' })).status, 200);
  assert.equal((await h.prisma.staff.findUnique({ where: { id } })).isActive, false, 'retained, deactivated');
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: created.json.data.userId.email, password } })).status, 401);
  assert.equal((await h.request('/api/staff/00000000-0000-4000-8000-000000000000', { token: P.admin.token })).status, 404);
});

test('doctor creation: validation, duplicate license, and safe response', async () => {
  const body = (overrides = {}) => ({ name: 'Synthetic Doctor', email: `integration-d-${h.tag()}@medilink.invalid`, phone: `IT-${h.tag()}`, specialization: 'Cardiology', licenseNumber: `IT-LIC-${h.tag()}`, ...overrides });
  for (const overrides of [{ specialization: '' }, { experience: 90 }, { consultationFee: -1 }, { email: 'bad' }, { availability: 'Mondays' }]) {
    assert.equal((await h.request('/api/doctors', { token: P.receptionist.token, method: 'POST', body: body(overrides) })).status, 400, JSON.stringify(overrides));
  }
  const first = body();
  const created = await h.request('/api/doctors', { token: P.receptionist.token, method: 'POST', body: first });
  assert.equal(created.status, 201);
  h.trackUser(created.json.data.userId._id || created.json.data.userId.id);
  assert.deepEqual(h.findSensitiveFieldPaths(created.json), []);
  assert.equal((await h.request('/api/doctors', { token: P.receptionist.token, method: 'POST', body: body({ licenseNumber: first.licenseNumber }) })).status, 409);
});

test('doctor update, availability, on-call, and deactivation guarded by upcoming appointments', async () => {
  const doctor = await h.createDoctor('lifecycle-doctor');
  const url = `/api/doctors/${doctor.profile.id}`;
  assert.equal((await h.request(url, { token: doctor.token, method: 'PUT', body: { experience: -1 } })).status, 400);
  assert.equal((await h.request(url, { token: doctor.token, method: 'PUT', body: { consultationFee: 750 } })).json.data.consultationFee, 750, 'doctor edits own profile');
  assert.equal((await h.request(`${url}/availability`, { token: doctor.token, method: 'PUT', body: { availability: 'Monday' } })).status, 400);
  assert.equal((await h.request(`${url}/availability`, { token: doctor.token, method: 'PUT', body: { availability: [{ day: 'Monday', slots: [{ startTime: '09:00', endTime: '10:00', isAvailable: true }] }] } })).status, 200);
  assert.equal((await h.request(`${url}/oncall`, { token: P.receptionist.token, method: 'POST', body: { startTime: '20:00', endTime: '23:00' } })).status, 400);
  assert.equal((await h.request(`${url}/oncall`, { token: P.receptionist.token, method: 'POST', body: { date: '2030-01-01', startTime: '20:00', endTime: '23:00' } })).status, 200);
  assert.equal((await h.request(`${url}/schedule`, { token: P.patient.token })).status, 200);

  const appointment = await h.createAppointment(P.patient.profile.id, doctor.profile.id);
  assert.equal((await h.request(url, { token: P.admin.token, method: 'DELETE' })).status, 409, 'upcoming appointments block deactivation');
  await h.prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'Cancelled' } });
  assert.equal((await h.request(url, { token: P.admin.token, method: 'DELETE' })).status, 200);
  const directory = await h.request('/api/doctors?limit=100', { token: P.patient.token });
  assert.equal(directory.json.data.some((d) => d.id === doctor.profile.id), false, 'deactivated doctor not offered');
});

test('reports: every admin report returns its documented envelope', async () => {
  const expected = {
    '/api/reports/patient-visits': ['stats', 'count', 'data'],
    '/api/reports/doctor-performance': ['count', 'data'],
    '/api/reports/ward-usage': ['overall', 'count', 'data'],
    '/api/reports/revenue': ['stats', 'count', 'data'],
    '/api/reports/dashboard': ['stats', 'recentActivities'],
  };
  for (const [url, keys] of Object.entries(expected)) {
    const res = await h.request(url, { token: P.admin.token });
    assert.equal(res.status, 200, url);
    for (const key of keys) assert.ok(key in res.json, `${url} has ${key}`);
  }
  assert.equal((await h.request('/api/reports/patient-visits?startDate=2024-01-01&endDate=2024-12-31', { token: P.admin.token })).status, 200);
});

test('dashboards: each role dashboard returns its envelope; a doctor without a profile gets 404', async () => {
  const cases = [
    ['/api/dashboards/admin', P.admin, 'dashboard'], ['/api/dashboards/doctor', P.doctor, 'doctorInfo'],
    ['/api/dashboards/patient', P.patient, 'patientInfo'], ['/api/dashboards/nurse', P.nurse, 'nurseInfo'],
    ['/api/dashboards/receptionist', P.receptionist, 'receptionistInfo'], ['/api/dashboards/pharmacist', P.pharmacist, 'pharmacistInfo'],
  ];
  for (const [url, principal, key] of cases) {
    const res = await h.request(url, { token: principal.token });
    assert.equal(res.status, 200, url);
    assert.ok(key in res.json, `${url} has ${key}`);
    assert.deepEqual(h.findSensitiveFieldPaths(res.json), [], url);
  }
  const profileless = await h.createUser('profileless-doctor', 'Doctor');
  assert.equal((await h.request('/api/dashboards/doctor', { token: profileless.token })).status, 404);
  const permissions = await h.request('/api/dashboards/permissions', { token: P.nurse.token });
  assert.equal(permissions.json.role, 'Nurse');
});

// ── AI patient-safety contracts (deterministic fallback; no provider) ────
const HIDDEN = ['_source', '_model', '_degraded', '_fallbackReason', 'sourceType', 'sourceLabel', 'sourceExplanation', 'providerUsed', 'modelUsed', 'fallbackUsed'];
const findHidden = (value, path = '$', found = []) => {
  if (Array.isArray(value)) value.forEach((v, i) => findHidden(v, `${path}[${i}]`, found));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (HIDDEN.includes(k)) found.push(`${path}.${k}`); findHidden(v, `${path}.${k}`, found); }
  return found;
};

test('AI: patients receive no provider/model/fallback metadata on any AI route; clinicians do', async () => {
  const calls = [
    ['/api/ai/chat', { message: 'How do I book an appointment?' }],
    ['/api/ai/symptom-analysis', { symptoms: 'mild headache' }],
    ['/api/ai/report-analysis', { reportText: 'Hemoglobin: 10 g/dL (reference range 12-16 g/dL)' }],
    ['/api/ai/health-risk', { age: 40 }],
    ['/api/ai/appointment-optimizer', { symptoms: 'cough' }],
    ['/api/ai/symptom-to-appointment', { symptoms: 'cough' }],
  ];
  for (const [url, body] of calls) {
    const res = await h.request(url, { token: P.patient.token, method: 'POST', body });
    assert.equal(res.status, 200, url);
    assert.deepEqual(findHidden(res.json), [], `${url} leaked technical metadata to a patient`);
    assert.equal(JSON.stringify(res.json).toLowerCase().includes('openrouter'), false);
  }
  const summary = await h.request(`/api/ai/patient-summary/${P.patient.profile.id}`, { token: P.patient.token });
  assert.deepEqual(findHidden(summary.json), []);
  const clinician = await h.request('/api/ai/symptom-analysis', { token: P.doctor.token, method: 'POST', body: { symptoms: 'mild headache' } });
  assert.ok(findHidden(clinician.json).length > 0, 'clinicians still receive provenance');
});

test('AI: emergency red flags escalate, results are non-diagnostic, and every call is audited without content', async () => {
  const before = await h.prisma.aiAuditEvent.count({ where: { requesterId: P.patient.user.id } });
  const emergency = await h.request('/api/ai/symptom-analysis', { token: P.patient.token, method: 'POST', body: { symptoms: 'severe chest pain with shortness of breath and sweating' } });
  assert.equal(emergency.status, 200);
  assert.equal(emergency.json.data.overallUrgency, 'Critical');
  assert.match(JSON.stringify(emergency.json.data), /emergency/i);
  const ordinary = await h.request('/api/ai/symptom-analysis', { token: P.patient.token, method: 'POST', body: { symptoms: 'mild headache' } });
  assert.notEqual(ordinary.json.data.overallUrgency, 'Critical');
  assert.equal((await h.request('/api/ai/symptom-analysis', { token: P.patient.token, method: 'POST', body: { symptoms: '' } })).status, 400);
  assert.equal((await h.request('/api/ai/health-risk', { token: P.patient.token, method: 'POST', body: { age: 300 } })).status, 400);

  const events = await h.prisma.aiAuditEvent.findMany({ where: { requesterId: P.patient.user.id }, orderBy: { createdAt: 'desc' } });
  assert.ok(events.length >= before + 2);
  assert.equal(events[0].source, 'degraded-fallback', 'audit records the true source (no provider configured) even though the patient response hides it');
  assert.equal(events[0].degraded, true);
  assert.equal(JSON.stringify(events).includes('chest pain'), false, 'no prompt content in the audit trail');
});

test('no request in this suite attempted to reach an external host', () => {
  assert.deepEqual(h.blockedRequests, []);
});

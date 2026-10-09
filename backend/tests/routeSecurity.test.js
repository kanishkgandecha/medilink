'use strict';

// Phase 1A route-level security regression tests. Uses the real Express app
// with an in-memory fake Prisma client — no database is contacted.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { bootFakeApp, listen } = require('./support/fakePrismaApp');

const id = () => crypto.randomUUID();
const user = (role, subRole = null) => ({
  id: id(), legacyMongoId: null, name: `Synthetic ${subRole || role}`, email: `${id()}@synthetic.invalid`,
  role, subRole, phone: '0000000000', isActive: true,
});

const U = {
  owner: user('Patient'), otherPatient: user('Patient'),
  doctor: user('Doctor'), unrelatedDoctor: user('Doctor'),
  nurse: user('Staff', 'Nurse'), idleNurse: user('Staff', 'Nurse'),
  lab: user('Staff', 'LabTechnician'), radiology: user('Staff', 'RadiologyTechnician'),
  pharmacist: user('Staff', 'Pharmacist'), billing: user('Staff', 'BillingStaff'),
  receptionist: user('Staff', 'Receptionist'), wardManager: user('Staff', 'WardManager'),
  admin: user('Admin'),
};
const patient = { id: id(), legacyMongoId: null, userId: U.owner.id, patientId: 'PT-SYNTH-1' };
const unscopedPatient = { id: id(), legacyMongoId: null, userId: U.otherPatient.id, patientId: 'PT-SYNTH-2' };
const doctorProfile = { id: id(), legacyMongoId: null, userId: U.doctor.id };
const unrelatedDoctorProfile = { id: id(), legacyMongoId: null, userId: U.unrelatedDoctor.id };

// Leaked credential fields are planted in this fixture on purpose to prove the
// response sanitizer strips them even if a controller forgets a safe select.
const leakyAppointment = {
  id: id(), legacyMongoId: null, patientId: patient.id, doctorId: doctorProfile.id,
  appointmentDate: new Date('2030-01-01'), startTime: '09:00', endTime: '09:30', status: 'Scheduled',
  patient: { id: patient.id, userId: U.owner.id, user: { id: U.owner.id, name: 'Synthetic', password: 'planted-hash', resetPasswordToken: 'planted-reset' } },
  doctor: { id: doctorProfile.id, userId: U.doctor.id, user: { id: U.doctor.id, name: 'Synthetic Dr', password: 'planted-hash-2', resetPasswordExpire: new Date() } },
};

const state = {
  users: Object.values(U),
  patients: [patient, unscopedPatient],
  doctors: [doctorProfile, unrelatedDoctorProfile],
  appointments: [{ id: id(), doctorId: doctorProfile.id, patientId: patient.id, status: 'Scheduled' }],
  prescriptions: [],
  beds: [],
  appointmentRecord: leakyAppointment,
};

const { app, calls, tokenFor } = bootFakeApp(state);
const { findSensitiveFieldPaths } = require('../utils/safeUser');
let http;
test.before(async () => { http = await listen(app); });
test.after(async () => { await http.close(); });

const tokenOf = (who) => (who === 'unauthenticated' ? undefined : tokenFor(U[who]));
const PRINCIPALS = ['unauthenticated', 'owner', 'otherPatient', 'doctor', 'unrelatedDoctor', 'nurse', 'lab',
  'radiology', 'pharmacist', 'billing', 'receptionist', 'wardManager', 'admin'];

const P = `/api/patients/${patient.id}`;
const H = id();
const R = id();
const N = id();
const ROUTES = [
  { name: 'POST medical-history', method: 'POST', path: `${P}/medical-history`, allowed: ['doctor', 'nurse'],
    body: { condition: 'Synthetic condition', diagnosedDate: '2024-01-01', status: 'Active' } },
  { name: 'PUT medical-history', method: 'PUT', path: `${P}/medical-history/${H}`, allowed: ['doctor', 'nurse'],
    body: { condition: 'Synthetic update' } },
  { name: 'DELETE (void) medical-history', method: 'DELETE', path: `${P}/medical-history/${H}`, allowed: ['doctor', 'nurse'],
    body: { reason: 'Synthetic void reason' } },
  { name: 'POST lab-report (Verified, lab modality)', method: 'POST', path: `${P}/lab-report`, allowed: ['doctor', 'nurse', 'lab'],
    body: { testName: 'Synthetic CBC', testType: 'Blood Test', status: 'Verified' } },
  { name: 'POST report attachment', method: 'POST', path: `${P}/lab-report/${R}/attachment`, allowed: ['doctor', 'nurse', 'lab', 'radiology'] },
  { name: 'GET clinical-notes', method: 'GET', path: `${P}/clinical-notes`, allowed: ['admin', 'doctor', 'nurse'] },
  { name: 'POST clinical draft', method: 'POST', path: `${P}/clinical-notes/drafts`, allowed: ['doctor', 'nurse'],
    body: { title: 'Synthetic draft', content: 'Synthetic draft content text.', source: 'ai' } },
  { name: 'POST clinical review', method: 'POST', path: `${P}/clinical-notes/${N}/review`, allowed: ['doctor'],
    body: { confirmed: true, content: 'Synthetic reviewed content.' } },
  { name: 'POST clinical amend', method: 'POST', path: `${P}/clinical-notes/${N}/amend`, allowed: ['doctor'],
    body: { confirmed: true, content: 'Synthetic amended content.', amendmentNote: 'Synthetic note' } },
  { name: 'PUT patient clinical fields', method: 'PUT', path: P, allowed: ['admin', 'doctor', 'nurse', 'receptionist'],
    body: { allergies: ['Synthetic allergen'] } },
  { name: 'GET medical-records', method: 'GET', path: `${P}/medical-records`, allowed: ['owner', 'admin', 'doctor', 'nurse'] },
  { name: 'GET AI patient-summary', method: 'GET', path: `/api/ai/patient-summary/${patient.id}`, allowed: ['owner', 'admin', 'doctor', 'nurse'] },
];

// "Allowed" here means the request passes authentication, role, ownership,
// and care-scope checks (status is neither 401 nor 403). Successful
// persistence is asserted by the DB-backed integration suite.
for (const route of ROUTES) {
  test(`authorization matrix: ${route.name}`, async () => {
    for (const who of PRINCIPALS) {
      const { status } = await http.request(route.path, { token: tokenOf(who), method: route.method, body: route.body });
      if (who === 'unauthenticated') assert.equal(status, 401, `${who} → ${route.name}`);
      else if (route.allowed.includes(who)) assert.ok(status !== 401 && status !== 403, `${who} should pass authorization for ${route.name}, got ${status}`);
      else assert.equal(status, 403, `${who} → ${route.name}`);
    }
  });
}

test('a nurse without an active encounter for the patient is denied clinical access', async () => {
  const res = await http.request(`/api/patients/${unscopedPatient.id}/medical-records`, { token: tokenOf('nurse') });
  assert.equal(res.status, 403);
});

test('a patient owner may update contact details but not clinical fields', async () => {
  const clinical = await http.request(P, { token: tokenOf('owner'), method: 'PUT', body: { bloodGroup: 'O_POSITIVE' } });
  assert.equal(clinical.status, 403);
  const contact = await http.request(P, { token: tokenOf('owner'), method: 'PUT', body: { emergencyContact: { name: 'Synthetic' } } });
  assert.notEqual(contact.status, 403);
});

test('radiology technicians cannot create lab-modality reports', async () => {
  const res = await http.request(`${P}/lab-report`, { token: tokenOf('radiology'), method: 'POST', body: { testName: 'Synthetic CBC', testType: 'Blood Test' } });
  assert.equal(res.status, 403);
});

test('appointment list is limited to scheduling and clinical roles', async () => {
  for (const who of ['pharmacist', 'billing', 'lab', 'radiology', 'wardManager']) {
    assert.equal((await http.request('/api/appointments', { token: tokenOf(who) })).status, 403, who);
  }
  for (const who of ['admin', 'doctor', 'owner', 'nurse', 'receptionist']) {
    assert.equal((await http.request('/api/appointments', { token: tokenOf(who) })).status, 200, who);
  }
});

test('patient list projections never request clinical sub-records and are care-scoped for doctors', async () => {
  const clinicalKeys = ['medicalHistory', 'currentMedications', 'labReports', 'imagingData', 'admissionHistory'];
  for (const who of ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'billing', 'wardManager']) {
    calls.length = 0;
    const res = await http.request('/api/patients', { token: tokenOf(who) });
    assert.equal(res.status, 200, who);
    const query = calls.find((c) => c.model === 'patient' && c.method === 'findMany');
    assert.ok(query, `${who} list query issued`);
    assert.ok(query.args.select, `${who} list uses an explicit select`);
    assert.equal(query.args.include, undefined, `${who} list must not use include`);
    for (const key of clinicalKeys) assert.equal(key in query.args.select, false, `${who} list selects ${key}`);
    if (who === 'billing' || who === 'wardManager' || who === 'nurse') {
      assert.equal('allergies' in query.args.select, false, `${who} list must not select allergies`);
    }
    if (who === 'doctor') {
      assert.ok(JSON.stringify(query.args.where.AND).includes(doctorProfile.id), 'doctor list filtered by care relationship');
    }
  }
});

test('responses are stripped of credential fields even when a fixture leaks them', async () => {
  const res = await http.request(`/api/appointments/${leakyAppointment.id}`, { token: tokenOf('admin') });
  assert.equal(res.status, 200);
  assert.deepEqual(findSensitiveFieldPaths(res.json), []);
  assert.equal(res.text.includes('planted-'), false);
});

test('validation errors never echo the submitted value', async () => {
  const marker = 'Zq7-synthetic-short';
  const res = await http.request('/api/auth/register', {
    method: 'POST', body: { name: 'Synthetic', email: 'not-an-email', password: 'x', phone: marker },
  });
  assert.equal(res.status, 400);
  for (const error of res.json.errors) assert.equal('value' in error, false);
  const leak = await http.request('/api/auth/reset-password/abc', { method: 'POST', body: { password: marker } });
  assert.equal(leak.status, 400);
  assert.equal(leak.text.includes(marker), false);
});

test('request logging records the route pattern, never the raw path token or query string', async () => {
  const logger = require('../utils/logger');
  const original = logger.info;
  const entries = [];
  logger.info = (message, meta) => { entries.push({ message, meta }); };
  try {
    const token = crypto.randomBytes(20).toString('hex');
    const res = await http.request(`/api/auth/reset-password/${token}?q=Synthetic%20Name`, { method: 'POST', body: { password: 'x' } });
    assert.ok(res.headers.get('x-request-id'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    const serialized = JSON.stringify(entries);
    assert.equal(serialized.includes(token), false, 'reset token must not be logged');
    assert.equal(serialized.includes('Synthetic'), false, 'query string must not be logged');
    const line = entries.find((e) => e.message === 'request');
    assert.equal(line.meta.route, '/api/auth/reset-password/:resettoken');
    assert.equal(line.meta.status, 400);
    assert.ok(Number.isInteger(line.meta.durationMs));
  } finally {
    logger.info = original;
  }
});

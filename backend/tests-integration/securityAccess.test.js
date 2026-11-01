'use strict';

// Phase 1A security regression suite (DB-backed). Synthetic fixtures only.
// Runs exclusively against a guarded, disposable *_test database.

require('dotenv').config();
process.env.NODE_ENV = 'test';
// Never contact the external AI provider from tests (dotenv may have loaded a key).
process.env.OPENROUTER_API_KEY = ''; // blank, not deleted: server.js re-runs dotenv, which would restore a deleted key

const { useSafeTestDatabase } = require('./support/databaseGuard');
require('./support/noExternalNetwork');
const testDatabase = useSafeTestDatabase();

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs/promises');
const prisma = require('../config/prisma');
const { flushAudits } = require('../utils/audit');
const { generateToken } = require('../utils/userHelpers');
const { REPORT_ATTACHMENT_DIR } = require('../middleware/upload');
const { findSensitiveFieldPaths } = require('../utils/safeUser');
const app = require('../server');

let server;
let baseUrl;
const fixtureUserIds = [];
const fixtureFiles = [];
const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(64, 0)]);
const run = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let counter = 0;
const tag = () => `${run}-${(counter += 1)}`;

const request = async (apiPath, { token, method = 'GET', body } = {}) => {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_error) { json = null; }
  return { status: response.status, json };
};

const upload = async (apiPath, token) => {
  const form = new FormData();
  form.append('attachment', new Blob([PDF_BYTES], { type: 'application/pdf' }), 'synthetic.pdf');
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form,
  });
  return { status: response.status, json: await response.json().catch(() => null) };
};

const createUser = async (label, role, subRole = null) => {
  const user = await prisma.user.create({ data: {
    name: `Synthetic ${label}`, email: `integration-sec-${label}-${tag()}@medilink.invalid`,
    password: 'integration-test-only-not-a-real-hash', phone: `IT-SEC-${tag()}`, role, subRole,
  } });
  fixtureUserIds.push(user.id);
  return { user, token: generateToken(user) };
};

const principals = {};
let patient;
let doctorProfile;

test.before(async () => {
  await prisma.$connect();
  const [{ current_database: connected }] = await prisma.$queryRaw`SELECT current_database()`;
  if (connected !== testDatabase.database) throw new Error('Connected database is not the confirmed test database');
  await prisma.user.deleteMany({ where: { email: { startsWith: 'integration-sec-' } } });

  principals.owner = await createUser('owner', 'Patient');
  principals.otherPatient = await createUser('other-patient', 'Patient');
  principals.doctor = await createUser('doctor', 'Doctor');
  principals.unrelatedDoctor = await createUser('unrelated-doctor', 'Doctor');
  principals.nurse = await createUser('nurse', 'Staff', 'Nurse');
  principals.lab = await createUser('lab', 'Staff', 'LabTechnician');
  principals.radiology = await createUser('radiology', 'Staff', 'RadiologyTechnician');
  principals.pharmacist = await createUser('pharmacist', 'Staff', 'Pharmacist');
  principals.billing = await createUser('billing', 'Staff', 'BillingStaff');
  principals.receptionist = await createUser('receptionist', 'Staff', 'Receptionist');
  principals.wardManager = await createUser('ward-manager', 'Staff', 'WardManager');
  principals.admin = await createUser('admin', 'Admin');

  patient = await prisma.patient.create({ data: {
    userId: principals.owner.user.id, patientId: `IT-SEC-${tag()}`, allergies: ['Synthetic allergen'],
    medicalHistory: { create: [{ condition: 'Synthetic condition', diagnosedDate: new Date('2020-01-01'), status: 'Chronic' }] },
  } });
  await prisma.patient.create({ data: { userId: principals.otherPatient.user.id, patientId: `IT-SEC-${tag()}`, allergies: [] } });
  doctorProfile = await prisma.doctor.create({ data: {
    userId: principals.doctor.user.id, specialization: 'General Medicine', qualification: 'MBBS', experience: 5,
    licenseNumber: `IT-SEC-LIC-${tag()}`, department: 'General Medicine', consultationFee: 500,
  } });
  await prisma.doctor.create({ data: {
    userId: principals.unrelatedDoctor.user.id, specialization: 'Dermatology', qualification: 'MBBS', experience: 5,
    licenseNumber: `IT-SEC-LIC-${tag()}`, department: 'Dermatology', consultationFee: 500,
  } });
  const appointmentDate = new Date();
  appointmentDate.setUTCDate(appointmentDate.getUTCDate() + 10);
  // Care relationship for `doctor`, and an active encounter for nurse scope.
  await prisma.appointment.create({ data: {
    patientId: patient.id, doctorId: doctorProfile.id, appointmentDate, startTime: '09:00', endTime: '09:30',
    type: 'Consultation', status: 'Scheduled', bookingKey: `integration-sec-${tag()}`, symptoms: 'Synthetic symptoms',
  } });

  server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  await flushAudits();
  const auditPatients = await prisma.patient.findMany({ where: { userId: { in: fixtureUserIds } }, select: { id: true } });
  await prisma.auditEvent.deleteMany({ where: { OR: [
    { actorId: { in: fixtureUserIds } }, { patientId: { in: auditPatients.map((p) => p.id) } }, { resourceId: { in: fixtureUserIds } },
  ] } });
  await Promise.all(fixtureFiles.map((name) => fs.unlink(path.join(REPORT_ATTACHMENT_DIR, name)).catch(() => {})));
  const reports = await prisma.labReport.findMany({
    where: { patient: { userId: { in: fixtureUserIds } }, attachmentStoredName: { not: null } },
    select: { attachmentStoredName: true },
  });
  await Promise.all(reports.map((r) => fs.unlink(path.join(REPORT_ATTACHMENT_DIR, r.attachmentStoredName)).catch(() => {})));
  await prisma.clinicalNote.deleteMany({ where: { OR: [
    { createdById: { in: fixtureUserIds } }, { patient: { userId: { in: fixtureUserIds } } },
  ] } });
  await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await prisma.$disconnect();
});

const ALL = ['unauthenticated', 'owner', 'otherPatient', 'doctor', 'unrelatedDoctor', 'nurse', 'lab', 'radiology',
  'pharmacist', 'billing', 'receptionist', 'wardManager', 'admin'];

const newReport = async (testType = 'Blood Test') => (await prisma.labReport.create({ data: {
  patientId: patient.id, testName: `Synthetic ${testType}`, testType, status: 'Pending',
} })).id;

const newDraft = async () => (await prisma.clinicalNote.create({ data: {
  patientId: patient.id, title: 'Synthetic draft', status: 'Draft', source: 'ai', createdById: principals.doctor.user.id,
  versions: { create: { version: 1, content: 'Synthetic AI draft content for review.', isAiGenerated: true, createdById: principals.doctor.user.id } },
} })).id;

// Each case: allowed principals; everyone else must get 403 (401 when unauthenticated).
const SENSITIVE_ROUTES = [
  { name: 'add medical history', allowed: ['doctor', 'nurse'],
    send: (token) => request(`/api/patients/${patient.id}/medical-history`, { token, method: 'POST',
      body: { condition: 'Synthetic added condition', diagnosedDate: '2024-01-01', status: 'Active' } }) },
  { name: 'void medical history', allowed: ['doctor', 'nurse'],
    send: async (token) => {
      const history = await prisma.medicalHistory.create({ data: {
        patientId: patient.id, condition: 'Synthetic voidable', diagnosedDate: new Date('2021-01-01'), status: 'Resolved' } });
      return request(`/api/patients/${patient.id}/medical-history/${history.id}`, { token, method: 'DELETE', body: { reason: 'Synthetic void reason' } });
    } },
  { name: 'create verified lab report (lab modality)', allowed: ['doctor', 'nurse', 'lab'],
    send: (token) => request(`/api/patients/${patient.id}/lab-report`, { token, method: 'POST',
      body: { testName: 'Synthetic CBC', testType: 'Blood Test', status: 'Verified', result: 'Synthetic result' } }) },
  { name: 'upload report attachment', allowed: ['doctor', 'nurse', 'lab'],
    send: async (token) => upload(`/api/patients/${patient.id}/lab-report/${await newReport()}/attachment`, token) },
  { name: 'create clinical draft', allowed: ['doctor', 'nurse'],
    send: (token) => request(`/api/patients/${patient.id}/clinical-notes/drafts`, { token, method: 'POST',
      body: { title: 'Synthetic draft', content: 'Synthetic draft content for review.', source: 'record-derived' } }) },
  { name: 'list clinical notes (includes unreviewed drafts)', allowed: ['admin', 'doctor', 'nurse'],
    send: (token) => request(`/api/patients/${patient.id}/clinical-notes`, { token }) },
  { name: 'review clinical note', allowed: ['doctor'],
    send: async (token) => request(`/api/patients/${patient.id}/clinical-notes/${await newDraft()}/review`, { token, method: 'POST',
      body: { confirmed: true, content: 'Synthetic clinician-reviewed content.' } }) },
  { name: 'update clinical fields on patient profile', allowed: ['admin', 'doctor', 'nurse', 'receptionist'],
    send: (token) => request(`/api/patients/${patient.id}`, { token, method: 'PUT', body: { allergies: ['Synthetic allergen'] } }) },
  { name: 'read medical records', allowed: ['owner', 'admin', 'doctor', 'nurse'],
    send: (token) => request(`/api/patients/${patient.id}/medical-records`, { token }) },
];

for (const route of SENSITIVE_ROUTES) {
  test(`authorization matrix: ${route.name}`, async () => {
    for (const who of ALL) {
      const token = who === 'unauthenticated' ? undefined : principals[who].token;
      const { status } = await route.send(token);
      const expected = who === 'unauthenticated' ? 401 : route.allowed.includes(who) ? 'success' : 403;
      if (expected === 'success') assert.ok(status >= 200 && status < 300, `${who} should succeed on "${route.name}", got ${status}`);
      else assert.equal(status, expected, `${who} on "${route.name}"`);
    }
  });
}

test('patient owner may update non-clinical contact details only', async () => {
  const ok = await request(`/api/patients/${patient.id}`, { token: principals.owner.token, method: 'PUT',
    body: { emergencyContact: { name: 'Synthetic Contact', phone: '0000000000', relation: 'Friend' } } });
  assert.equal(ok.status, 200);
});

test('radiology technician cannot create a lab-modality report', async () => {
  const res = await request(`/api/patients/${patient.id}/lab-report`, { token: principals.radiology.token, method: 'POST',
    body: { testName: 'Synthetic CBC', testType: 'Blood Test' } });
  assert.equal(res.status, 403);
});

test('patient list is care-scoped for doctors and never includes clinical sub-records', async () => {
  const doctorList = await request('/api/patients?limit=100', { token: principals.doctor.token });
  assert.equal(doctorList.status, 200);
  assert.ok(doctorList.json.data.some((p) => p._id === patient.id));
  const unrelated = await request('/api/patients?limit=100', { token: principals.unrelatedDoctor.token });
  assert.equal(unrelated.json.data.some((p) => p._id === patient.id), false);

  for (const who of ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'billing', 'wardManager']) {
    const res = await request('/api/patients?limit=100', { token: principals[who].token });
    assert.equal(res.status, 200, who);
    for (const row of res.json.data) {
      for (const key of ['medicalHistory', 'currentMedications', 'labReports', 'imagingData', 'admissionHistory']) {
        assert.equal(key in row, false, `${who} list row must not include ${key}`);
      }
    }
  }
  const billingRow = (await request('/api/patients?limit=100', { token: principals.billing.token })).json.data[0];
  assert.equal('allergies' in billingRow, false);
});

test('appointment list is limited to scheduling and clinical roles', async () => {
  for (const who of ['pharmacist', 'billing', 'lab', 'radiology', 'wardManager']) {
    assert.equal((await request('/api/appointments', { token: principals[who].token })).status, 403, who);
  }
  for (const who of ['admin', 'doctor', 'owner', 'nurse', 'receptionist']) {
    assert.equal((await request('/api/appointments', { token: principals[who].token })).status, 200, who);
  }
});

test('no normal API response contains password or reset-token fields', async () => {
  const appointment = await prisma.appointment.findFirst({ where: { patientId: patient.id } });
  const checks = [
    ['owner', '/api/auth/me'], ['owner', '/api/auth/my-profile'], ['owner', '/api/dashboards/patient'],
    ['owner', `/api/appointments/${appointment.id}`], ['doctor', `/api/appointments/${appointment.id}`],
    ['admin', '/api/patients?limit=20'], ['admin', `/api/patients/${patient.id}`], ['admin', '/api/appointments'],
    ['billing', '/api/billing'], ['admin', '/api/staff'], ['admin', '/api/doctors'], ['pharmacist', '/api/prescriptions'],
  ];
  for (const [who, apiPath] of checks) {
    const res = await request(apiPath, { token: principals[who].token });
    assert.ok(res.status < 500, `${apiPath} as ${who} returned ${res.status}`);
    assert.deepEqual(findSensitiveFieldPaths(res.json), [], `${apiPath} as ${who} leaked sensitive fields`);
  }
  const written = await request(`/api/patients/${patient.id}/medical-history`, { token: principals.doctor.token, method: 'POST',
    body: { condition: 'Synthetic for sanitization', diagnosedDate: '2024-02-01', status: 'Active' } });
  assert.equal(written.status, 200);
  assert.deepEqual(findSensitiveFieldPaths(written.json), []);
});

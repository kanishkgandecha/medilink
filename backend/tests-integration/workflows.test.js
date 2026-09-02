'use strict';

require('dotenv').config();
process.env.NODE_ENV = 'test';
process.env.AI_REQUESTS_PER_MINUTE = '3';

const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/userHelpers');
const app = require('../server');

let server;
let baseUrl;
const fixtureUserIds = [];
const fixtureWardIds = [];

const api = async (path, { token, method = 'GET', body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, json: await response.json() };
};

const createUser = async ({ suffix, role, subRole }) => {
  const user = await prisma.user.create({ data: {
    name: `Integration ${role}`,
    email: `integration-${suffix}@medilink.invalid`,
    password: 'integration-test-only',
    phone: `IT-${suffix}`,
    role,
    subRole: subRole || null,
  } });
  fixtureUserIds.push(user.id);
  return { user, token: generateToken(user) };
};

test.before(async () => {
  await prisma.$connect();
  // Recover only stale fixtures left by an interrupted prior integration run.
  await prisma.clinicalNote.deleteMany({ where: { createdBy: { email: { startsWith: 'integration-' } } } });
  await prisma.ward.deleteMany({ where: { wardNumber: { startsWith: 'IT-WARD-' } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: 'integration-' } } });
  server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test('AI endpoints enforce the same role policy advertised by the UI', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pharmacist = await createUser({ suffix: `ai-pharmacist-${suffix}`, role: 'Staff', subRole: 'Pharmacist' });
  const receptionist = await createUser({ suffix: `ai-reception-${suffix}`, role: 'Staff', subRole: 'Receptionist' });
  const billing = await createUser({ suffix: `ai-billing-${suffix}`, role: 'Staff', subRole: 'BillingStaff' });

  const pharmacistRisk = await api('/api/ai/health-risk', {
    token: pharmacist.token, method: 'POST', body: { age: 40 },
  });
  assert.equal(pharmacistRisk.response.status, 403);

  const receptionistBed = await api('/api/ai/bed-allocation', {
    token: receptionist.token, method: 'POST', body: { condition: 'routine observation' },
  });
  assert.equal(receptionistBed.response.status, 403);

  const billingSymptoms = await api('/api/ai/symptom-analysis', {
    token: billing.token, method: 'POST', body: { symptoms: 'headache' },
  });
  assert.equal(billingSymptoms.response.status, 403);

  const billingChat = await api('/api/ai/chat', {
    token: billing.token, method: 'POST', body: { message: 'Open billing' },
  });
  assert.equal(billingChat.response.status, 200);
});

test('diagnostic staff receive modality-scoped queues without general patient access', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `diagnostic-patient-${suffix}`, role: 'Patient' });
  const lab = await createUser({ suffix: `diagnostic-lab-${suffix}`, role: 'Staff', subRole: 'LabTechnician' });
  const radiology = await createUser({ suffix: `diagnostic-radiology-${suffix}`, role: 'Staff', subRole: 'RadiologyTechnician' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id,
    patientId: `IT-DIAGNOSTIC-${suffix}`,
    labReports: { create: [
      { testName: 'CBC', testType: 'Blood Test', status: 'Pending' },
      { testName: 'Chest X-Ray', testType: 'X-Ray', status: 'Completed' },
    ] },
  } });

  const labWorkspace = await api('/api/patients/diagnostic-workspace', { token: lab.token });
  assert.equal(labWorkspace.response.status, 200);
  assert.ok(labWorkspace.json.data.recentReports.every((report) => report.testType !== 'X-Ray'));
  assert.equal('email' in labWorkspace.json.data.patients[0], false);
  assert.equal('phone' in labWorkspace.json.data.patients[0], false);

  const createdImagingReport = await api(`/api/patients/${patient.id}/lab-report`, {
    token: radiology.token,
    method: 'POST',
    body: { testName: 'Follow-up MRI', testType: 'MRI Scan', status: 'Verified', result: 'Recorded imaging result' },
  });
  assert.equal(createdImagingReport.response.status, 200);

  const radiologyRecords = await api(`/api/patients/diagnostic-workspace/${patient.id}`, { token: radiology.token });
  assert.equal(radiologyRecords.response.status, 200);
  assert.deepEqual(new Set(radiologyRecords.json.data.labReports.map((report) => report.testType)), new Set(['X-Ray', 'MRI Scan']));

  const broadPatientList = await api('/api/patients', { token: lab.token });
  assert.equal(broadPatientList.response.status, 403);
});

test.after(async () => {
  if (fixtureWardIds.length) {
    await prisma.ward.deleteMany({ where: { id: { in: fixtureWardIds } } });
  }
  if (fixtureUserIds.length) {
    await prisma.clinicalNote.deleteMany({ where: {
      OR: [{ createdById: { in: fixtureUserIds } }, { patient: { userId: { in: fixtureUserIds } } }],
    } });
    await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
  }
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await prisma.$disconnect();
});

test('health endpoint verifies the live database connection', async () => {
  const { response, json } = await api('/health');
  assert.equal(response.status, 200);
  assert.equal(json.status, 'ok');
  assert.equal(json.database, 'PostgreSQL');
});

test('patient summaries enforce ownership and persist privacy-safe AI audits', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const owner = await createUser({ suffix: `owner-${suffix}`, role: 'Patient' });
  const other = await createUser({ suffix: `other-${suffix}`, role: 'Patient' });
  const ownerProfile = await prisma.patient.create({ data: {
    userId: owner.user.id, patientId: `IT-OWNER-${suffix}`, allergies: ['Penicillin'],
  } });
  const otherProfile = await prisma.patient.create({ data: {
    userId: other.user.id, patientId: `IT-OTHER-${suffix}`, allergies: [],
  } });

  const ownResult = await api(`/api/ai/patient-summary/${ownerProfile.id}`, { token: owner.token });
  assert.equal(ownResult.response.status, 200);
  assert.equal(ownResult.json.success, true);
  assert.equal(ownResult.json.data._source, 'records');

  const forbidden = await api(`/api/ai/patient-summary/${otherProfile.id}`, { token: owner.token });
  assert.equal(forbidden.response.status, 403);

  const audit = await prisma.aiAuditEvent.findFirst({
    where: { requesterId: owner.user.id, agent: 'patient_summary' },
  });
  assert.ok(audit);
  assert.equal(audit.success, true);
  assert.equal(audit.source, 'records');
});

test('doctor access and ordinary staff denial are enforced at the patient boundary', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patient = await createUser({ suffix: `role-patient-${suffix}`, role: 'Patient' });
  const doctor = await createUser({ suffix: `role-doctor-${suffix}`, role: 'Doctor' });
  const staff = await createUser({ suffix: `role-staff-${suffix}`, role: 'Staff' });
  const profile = await prisma.patient.create({ data: {
    userId: patient.user.id, patientId: `IT-ROLE-${suffix}`, allergies: [],
  } });

  const clinicianResult = await api(`/api/ai/patient-summary/${profile.id}`, { token: doctor.token });
  assert.equal(clinicianResult.response.status, 200);
  const staffResult = await api(`/api/ai/patient-summary/${profile.id}`, { token: staff.token });
  assert.equal(staffResult.response.status, 403);
});

test('appointment booking is idempotent and rejects a competing active slot', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const first = await createUser({ suffix: `booker-a-${suffix}`, role: 'Patient' });
  const second = await createUser({ suffix: `booker-b-${suffix}`, role: 'Patient' });
  const doctorUser = await createUser({ suffix: `doctor-${suffix}`, role: 'Doctor' });
  await prisma.patient.create({ data: { userId: first.user.id, patientId: `IT-A-${suffix}`, allergies: [] } });
  await prisma.patient.create({ data: { userId: second.user.id, patientId: `IT-B-${suffix}`, allergies: [] } });

  const appointmentDate = new Date();
  appointmentDate.setUTCDate(appointmentDate.getUTCDate() + 7);
  appointmentDate.setUTCHours(0, 0, 0, 0);
  const dateText = appointmentDate.toISOString().slice(0, 10);
  const day = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const doctor = await prisma.doctor.create({ data: {
    userId: doctorUser.user.id,
    specialization: 'General Medicine', qualification: 'MBBS', experience: 5,
    licenseNumber: `IT-LIC-${suffix}`, department: 'General Medicine', consultationFee: 500,
    availability: [{ day, slots: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }] }],
  } });
  const payload = {
    doctor: doctor.id, appointmentDate: dateText,
    timeSlot: { startTime: '09:00', endTime: '09:30' },
    type: 'Consultation', bookingKey: `integration-booking-${suffix}`,
  };

  const created = await api('/api/appointments', { token: first.token, method: 'POST', body: payload });
  assert.equal(created.response.status, 201);
  assert.equal(created.json.replayed, false);

  const replay = await api('/api/appointments', { token: first.token, method: 'POST', body: payload });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.json.replayed, true);
  assert.equal(replay.json.data.id, created.json.data.id);

  const conflict = await api('/api/appointments', {
    token: second.token, method: 'POST', body: { ...payload, bookingKey: `integration-conflict-${suffix}` },
  });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.json.code, 'slot_conflict');
});

test('AI-derived clinical notes require doctor confirmation and preserve every version', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patient = await createUser({ suffix: `note-patient-${suffix}`, role: 'Patient' });
  const nurse = await createUser({ suffix: `note-nurse-${suffix}`, role: 'Nurse' });
  const doctor = await createUser({ suffix: `note-doctor-${suffix}`, role: 'Doctor' });
  const profile = await prisma.patient.create({ data: {
    userId: patient.user.id, patientId: `IT-NOTE-${suffix}`, allergies: [],
  } });
  const draftContent = 'AI-derived draft content requiring independent clinician verification.';
  const draft = await api(`/api/patients/${profile.id}/clinical-notes/drafts`, {
    token: nurse.token, method: 'POST', body: {
      title: 'Generated patient summary', content: draftContent,
      source: 'ai', sourceAgent: 'patient_summary',
    },
  });
  assert.equal(draft.response.status, 201);
  assert.equal(draft.json.data.status, 'Draft');
  assert.equal(draft.json.data.versions[0].clinicallyConfirmed, false);
  assert.equal(draft.json.data.versions[0].isAiGenerated, true);
  const noteId = draft.json.data.id;

  const unconfirmed = await api(`/api/patients/${profile.id}/clinical-notes/${noteId}/review`, {
    token: doctor.token, method: 'POST', body: { confirmed: false, content: draftContent },
  });
  assert.equal(unconfirmed.response.status, 400);

  const nurseReview = await api(`/api/patients/${profile.id}/clinical-notes/${noteId}/review`, {
    token: nurse.token, method: 'POST', body: { confirmed: true, content: draftContent },
  });
  assert.equal(nurseReview.response.status, 403);

  const reviewedContent = 'Clinician-reviewed summary based on the source records and independent assessment.';
  const reviewed = await api(`/api/patients/${profile.id}/clinical-notes/${noteId}/review`, {
    token: doctor.token, method: 'POST', body: {
      confirmed: true, content: reviewedContent, amendmentNote: 'Verified against source records',
    },
  });
  assert.equal(reviewed.response.status, 200);
  assert.equal(reviewed.json.data.status, 'Reviewed');
  assert.equal(reviewed.json.data.currentVersion, 2);
  assert.equal(reviewed.json.data.versions.length, 2);
  assert.equal(reviewed.json.data.versions[1].clinicallyConfirmed, true);

  const amendedContent = `${reviewedContent} Follow-up information was added.`;
  const amended = await api(`/api/patients/${profile.id}/clinical-notes/${noteId}/amend`, {
    token: doctor.token, method: 'POST', body: {
      confirmed: true, content: amendedContent, amendmentNote: 'Added follow-up information',
    },
  });
  assert.equal(amended.response.status, 200);
  assert.equal(amended.json.data.currentVersion, 3);
  assert.deepEqual(amended.json.data.versions.map((item) => item.content),
    [draftContent, reviewedContent, amendedContent]);

  const events = await prisma.clinicalAuditEvent.findMany({
    where: { patientId: profile.id, recordType: 'ClinicalNote', recordId: noteId },
    orderBy: { createdAt: 'asc' },
  });
  assert.deepEqual(events.map((event) => event.action), ['DRAFT_CREATED', 'CLINICIAN_REVIEWED', 'AMENDED']);
});

test('AI degrades safely, exposes admin-only reliability, and rate limits per user', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patient = await createUser({ suffix: `ai-patient-${suffix}`, role: 'Patient' });
  const admin = await createUser({ suffix: `ai-admin-${suffix}`, role: 'Admin' });
  const rateUser = await createUser({ suffix: `ai-rate-${suffix}`, role: 'Patient' });
  const previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const degraded = await api('/api/ai/symptom-analysis', {
      token: patient.token, method: 'POST', body: { symptoms: 'mild headache' },
    });
    assert.equal(degraded.response.status, 200);
    assert.equal(degraded.json.data._source, 'rules');
    assert.equal(degraded.json.data._degraded, true);

    const denied = await api('/api/ai/reliability', { token: patient.token });
    assert.equal(denied.response.status, 403);

    const reliability = await api('/api/ai/reliability', { token: admin.token });
    assert.equal(reliability.response.status, 200);
    assert.equal(reliability.json.success, true);
    assert.ok(reliability.json.data.total >= 1);

    const attempts = [];
    for (let index = 0; index < 4; index += 1) {
      attempts.push(await api('/api/ai/chat', {
        token: rateUser.token, method: 'POST', body: { message: 'Where is the emergency department?' },
      }));
    }
    assert.equal(attempts[3].response.status, 429);
    assert.equal(attempts[3].json.code, 'AI_RATE_LIMITED');
  } finally {
    if (previousKey) process.env.OPENROUTER_API_KEY = previousKey;
  }
});

test('remaining AI routes use live doctor, bed, operational, and pharmacy data safely', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clinical = await createUser({ suffix: `ai-clinical-${suffix}`, role: 'Patient' });
  const orchestration = await createUser({ suffix: `ai-chain-${suffix}`, role: 'Patient' });
  const admin = await createUser({ suffix: `ai-ops-${suffix}`, role: 'Admin' });
  const doctorUser = await createUser({ suffix: `ai-live-doctor-${suffix}`, role: 'Doctor' });
  const doctor = await prisma.doctor.create({ data: {
    userId: doctorUser.user.id,
    specialization: 'General Medicine', qualification: 'MBBS', experience: 8,
    licenseNumber: `IT-AI-LIC-${suffix}`, department: 'General Medicine', consultationFee: 600,
    availability: [{ day: 'Monday', slots: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }] }],
  } });
  const ward = await prisma.ward.create({ data: {
    wardNumber: `IT-WARD-${suffix}`, wardName: `Integration General Ward ${suffix}`,
    wardType: 'General', totalBeds: 2, availableBeds: 2, facilities: [], dailyRate: 1000,
    beds: { create: [{ bedNumber: 'IT-1' }, { bedNumber: 'IT-2' }] },
  } });
  fixtureWardIds.push(ward.id);
  const previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    const report = await api('/api/ai/report-analysis', {
      token: clinical.token, method: 'POST',
      body: { reportType: 'CBC', reportText: 'Hemoglobin: 10 g/dL (reference range 12-16 g/dL)' },
    });
    assert.equal(report.response.status, 200);
    assert.equal(report.json.data._source, 'rules');

    const risk = await api('/api/ai/health-risk', {
      token: clinical.token, method: 'POST', body: { age: 45, chronicConditions: ['hypertension'] },
    });
    assert.equal(risk.response.status, 200);
    assert.equal(risk.json.data._source, 'rules');

    const optimized = await api('/api/ai/appointment-optimizer', {
      token: clinical.token, method: 'POST', body: { symptoms: 'fever and cough' },
    });
    assert.equal(optimized.response.status, 200);
    assert.equal(optimized.json.data.recommendedDoctor.id, doctor.id);

    const chained = await api('/api/ai/symptom-to-appointment', {
      token: orchestration.token, method: 'POST', body: { symptoms: 'fever and cough', age: 30 },
    });
    assert.equal(chained.response.status, 200);
    assert.ok(chained.json.data.symptomAnalysis);
    assert.ok(chained.json.data.appointmentOptimizer);

    const allocation = await api('/api/ai/bed-allocation', {
      token: admin.token, method: 'POST', body: { condition: 'routine observation', urgency: 'Routine', age: 30 },
    });
    assert.equal(allocation.response.status, 200);
    assert.equal(allocation.json.data.ward.id, ward.id);
    assert.equal(allocation.json.data.ward.suggestedBed, 'IT-1');

    const insights = await api('/api/ai/admin-insights', { token: admin.token });
    assert.equal(insights.response.status, 200);
    assert.equal(insights.json.success, true);

    const pharmacy = await api('/api/ai/pharmacy-alerts', { token: admin.token });
    assert.equal(pharmacy.response.status, 200);
    assert.equal(pharmacy.json.success, true);
  } finally {
    if (previousKey) process.env.OPENROUTER_API_KEY = previousKey;
  }
});

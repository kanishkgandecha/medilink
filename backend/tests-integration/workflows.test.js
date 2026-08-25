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

const createUser = async ({ suffix, role }) => {
  const user = await prisma.user.create({ data: {
    name: `Integration ${role}`,
    email: `integration-${suffix}@medilink.invalid`,
    password: 'integration-test-only',
    phone: `IT-${suffix}`,
    role,
  } });
  fixtureUserIds.push(user.id);
  return { user, token: generateToken(user) };
};

test.before(async () => {
  await prisma.$connect();
  server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (fixtureWardIds.length) {
    await prisma.ward.deleteMany({ where: { id: { in: fixtureWardIds } } });
  }
  if (fixtureUserIds.length) {
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

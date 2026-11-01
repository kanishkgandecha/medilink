'use strict';

require('dotenv').config();
process.env.NODE_ENV = 'test';
// Never contact the external AI provider from tests (dotenv may have loaded a key).
process.env.OPENROUTER_API_KEY = ''; // blank, not deleted: server.js re-runs dotenv, which would restore a deleted key
process.env.AI_REQUESTS_PER_MINUTE = '3';

// Must run before config/prisma is loaded: refuses unless TEST_DATABASE_URL is
// an explicitly confirmed, *_test-named database distinct from DATABASE_URL,
// then points this process at it.
const { useSafeTestDatabase } = require('./support/databaseGuard');
require('./support/noExternalNetwork');
const testDatabase = useSafeTestDatabase();

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs/promises');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/userHelpers');
const { REPORT_ATTACHMENT_DIR } = require('../middleware/upload');
const app = require('../server');

let server;
let baseUrl;
const fixtureUserIds = [];
const fixtureWardIds = [];
const fixtureMedicineIds = [];
const fixtureAttachmentFiles = [];

const apiUpload = async (apiPath, { token, fieldName, filename, mimetype, buffer, extraFields } = {}) => {
  const form = new FormData();
  form.append(fieldName || 'attachment', new Blob([buffer], { type: mimetype }), filename);
  for (const [key, value] of Object.entries(extraFields || {})) form.append(key, value);
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return { response, json: await response.json() };
};

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

// Creates a doctor profile plus a scheduled appointment so the doctor is in a
// care relationship with the patient (and the patient has an active encounter
// for nurse scope). Doctor/nurse access is care-scoped since Phase 1A.
let careLinkCounter = 0;
const linkDoctorToPatient = async (doctorUser, patientId) => {
  careLinkCounter += 1;
  const tag = `${Date.now()}-${careLinkCounter}-${Math.random().toString(16).slice(2)}`;
  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id, specialization: 'General Medicine', qualification: 'MBBS', experience: 5,
      licenseNumber: `IT-CARE-LIC-${tag}`, department: 'General Medicine', consultationFee: 500,
    },
  });
  const appointmentDate = new Date();
  appointmentDate.setUTCDate(appointmentDate.getUTCDate() + 14);
  const minute = String(careLinkCounter % 60).padStart(2, '0');
  await prisma.appointment.create({ data: {
    patientId, doctorId: doctor.id, appointmentDate, startTime: `08:${minute}`, endTime: `08:${minute}`,
    type: 'Consultation', status: 'Scheduled', bookingKey: `integration-care-${tag}`,
  } });
  return doctor;
};

test.before(async () => {
  await prisma.$connect();
  // Second, runtime check: the live connection must be the confirmed test database.
  const [{ current_database: connected }] = await prisma.$queryRaw`SELECT current_database()`;
  if (connected !== testDatabase.database) {
    throw new Error(`Connected to "${connected}" but expected the confirmed test database "${testDatabase.database}"`);
  }
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

const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(64, 0)]);

test('report attachments enforce modality scoping and record-level authorization on upload and download', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `attach-patient-${suffix}`, role: 'Patient' });
  const otherPatientUser = await createUser({ suffix: `attach-other-patient-${suffix}`, role: 'Patient' });
  const lab = await createUser({ suffix: `attach-lab-${suffix}`, role: 'Staff', subRole: 'LabTechnician' });
  const radiology = await createUser({ suffix: `attach-radiology-${suffix}`, role: 'Staff', subRole: 'RadiologyTechnician' });
  const doctor = await createUser({ suffix: `attach-doctor-${suffix}`, role: 'Doctor' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id,
    patientId: `IT-ATTACH-${suffix}`,
    labReports: { create: [
      { testName: 'CBC', testType: 'Blood Test', status: 'Pending' },
      { testName: 'Chest X-Ray', testType: 'X-Ray', status: 'Completed' },
    ] },
  }, include: { labReports: true } });
  const cbcReport = patient.labReports.find((r) => r.testType === 'Blood Test');
  const xrayReport = patient.labReports.find((r) => r.testType === 'X-Ray');
  await linkDoctorToPatient(doctor.user, patient.id);

  // Wrong modality: a lab technician cannot attach a file to an X-Ray report.
  const wrongModality = await apiUpload(`/api/patients/${patient.id}/lab-report/${xrayReport.id}/attachment`, {
    token: lab.token, filename: 'cbc-result.pdf', mimetype: 'application/pdf', buffer: PDF_BYTES,
  });
  assert.equal(wrongModality.response.status, 403);

  // Correct modality: lab tech uploads to the CBC (Blood Test) report.
  const upload = await apiUpload(`/api/patients/${patient.id}/lab-report/${cbcReport.id}/attachment`, {
    token: lab.token, filename: 'cbc-result.pdf', mimetype: 'application/pdf', buffer: PDF_BYTES,
  });
  assert.equal(upload.response.status, 200);
  assert.equal(upload.json.data.attachmentOriginalName, 'cbc-result.pdf');

  const stored = await prisma.labReport.findUnique({ where: { id: cbcReport.id } });
  fixtureAttachmentFiles.push(stored.attachmentStoredName);

  // Radiology tech cannot download a lab-modality report's attachment.
  const wrongModalityDownload = await api(`/api/patients/${patient.id}/lab-report/${cbcReport.id}/attachment`, { token: radiology.token });
  assert.equal(wrongModalityDownload.response.status, 403);

  // Owning patient can download their own attachment.
  const ownerDownload = await fetch(`${baseUrl}/api/patients/${patient.id}/lab-report/${cbcReport.id}/attachment`, {
    headers: { Authorization: `Bearer ${patientUser.token}` },
  });
  assert.equal(ownerDownload.status, 200);
  assert.equal(ownerDownload.headers.get('content-type'), 'application/pdf');

  // Doctor (unrestricted role) can also download it. A successful download
  // streams raw PDF bytes, not JSON, so it needs a plain fetch — the shared
  // `api()` helper always parses the body as JSON and would fail here.
  const doctorDownload = await fetch(`${baseUrl}/api/patients/${patient.id}/lab-report/${cbcReport.id}/attachment`, {
    headers: { Authorization: `Bearer ${doctor.token}` },
  });
  assert.equal(doctorDownload.status, 200);

  // A different patient has neither ownership nor a staff role — denied.
  const otherPatientDownload = await api(`/api/patients/${patient.id}/lab-report/${cbcReport.id}/attachment`, { token: otherPatientUser.token });
  assert.equal(otherPatientDownload.response.status, 403);
});

test('replacing a report attachment requires explicit confirmation and cleans up the previous file', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `replace-patient-${suffix}`, role: 'Patient' });
  const doctor = await createUser({ suffix: `replace-doctor-${suffix}`, role: 'Doctor' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id,
    patientId: `IT-REPLACE-${suffix}`,
    labReports: { create: [{ testName: 'Lipid Profile', testType: 'Lipid Profile', status: 'Pending' }] },
  }, include: { labReports: true } });
  const report = patient.labReports[0];
  await linkDoctorToPatient(doctor.user, patient.id);

  const first = await apiUpload(`/api/patients/${patient.id}/lab-report/${report.id}/attachment`, {
    token: doctor.token, filename: 'first.pdf', mimetype: 'application/pdf', buffer: PDF_BYTES,
  });
  assert.equal(first.response.status, 200);
  const afterFirst = await prisma.labReport.findUnique({ where: { id: report.id } });
  const firstStoredName = afterFirst.attachmentStoredName;
  const firstPath = path.join(REPORT_ATTACHMENT_DIR, firstStoredName);
  assert.equal(await fs.access(firstPath).then(() => true, () => false), true);

  // Without replace=true, a second upload is rejected — no silent overwrite.
  const blockedReplace = await apiUpload(`/api/patients/${patient.id}/lab-report/${report.id}/attachment`, {
    token: doctor.token, filename: 'second.pdf', mimetype: 'application/pdf', buffer: PDF_BYTES,
  });
  assert.equal(blockedReplace.response.status, 409);
  assert.equal(blockedReplace.json.existingAttachment.originalName, 'first.pdf');

  // With explicit replace=true, the new file is stored and the old one removed.
  const confirmedReplace = await apiUpload(`/api/patients/${patient.id}/lab-report/${report.id}/attachment`, {
    token: doctor.token, filename: 'second.pdf', mimetype: 'application/pdf', buffer: PDF_BYTES, extraFields: { replace: 'true' },
  });
  assert.equal(confirmedReplace.response.status, 200);
  assert.equal(confirmedReplace.json.message, 'Attachment replaced successfully');

  const afterReplace = await prisma.labReport.findUnique({ where: { id: report.id } });
  fixtureAttachmentFiles.push(afterReplace.attachmentStoredName);
  assert.notEqual(afterReplace.attachmentStoredName, firstStoredName);
  assert.equal(await fs.access(firstPath).then(() => true, () => false), false, 'previous attachment file should be deleted after a confirmed replace');
});

test('report attachment uploads reject files whose content does not match a validated signature', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `sig-patient-${suffix}`, role: 'Patient' });
  const doctor = await createUser({ suffix: `sig-doctor-${suffix}`, role: 'Doctor' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id,
    patientId: `IT-SIG-${suffix}`,
    labReports: { create: [{ testName: 'X-Ray Chest', testType: 'X-Ray', status: 'Pending' }] },
  }, include: { labReports: true } });
  const report = patient.labReports[0];
  await linkDoctorToPatient(doctor.user, patient.id);

  const spoofed = await apiUpload(`/api/patients/${patient.id}/lab-report/${report.id}/attachment`, {
    token: doctor.token, filename: 'fake.pdf', mimetype: 'application/pdf', buffer: Buffer.from('#!/bin/sh\necho not a pdf'),
  });
  assert.equal(spoofed.response.status, 400);

  const afterRejection = await prisma.labReport.findUnique({ where: { id: report.id } });
  assert.equal(afterRejection.attachmentStoredName, null);
});

test('report attachment uploads reject files over the 10MB size limit', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `size-patient-${suffix}`, role: 'Patient' });
  const doctor = await createUser({ suffix: `size-doctor-${suffix}`, role: 'Doctor' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id,
    patientId: `IT-SIZE-${suffix}`,
    labReports: { create: [{ testName: 'MRI Scan', testType: 'MRI Scan', status: 'Pending' }] },
  }, include: { labReports: true } });
  const report = patient.labReports[0];
  await linkDoctorToPatient(doctor.user, patient.id);

  const oversized = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(11 * 1024 * 1024, 0)]); // 11MB > 10MB limit
  const tooLarge = await apiUpload(`/api/patients/${patient.id}/lab-report/${report.id}/attachment`, {
    token: doctor.token, filename: 'huge.pdf', mimetype: 'application/pdf', buffer: oversized,
  });
  assert.equal(tooLarge.response.status, 400);

  const afterRejection = await prisma.labReport.findUnique({ where: { id: report.id } });
  assert.equal(afterRejection.attachmentStoredName, null);
});

test.after(async () => {
  if (fixtureAttachmentFiles.length) {
    await Promise.all(fixtureAttachmentFiles.map((name) =>
      fs.unlink(path.join(REPORT_ATTACHMENT_DIR, name)).catch(() => {})));
  }
  if (fixtureWardIds.length) {
    await prisma.ward.deleteMany({ where: { id: { in: fixtureWardIds } } });
  }
  if (fixtureMedicineIds.length) {
    await prisma.prescriptionMedicine.deleteMany({ where: { medicineId: { in: fixtureMedicineIds } } });
    await prisma.medicine.deleteMany({ where: { id: { in: fixtureMedicineIds } } });
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
  // Patients never receive provider/source/fallback metadata (Phase 1B); the
  // audit row below still records the true source server-side.
  for (const hidden of ['_source', '_degraded', '_fallbackReason', 'sourceType', 'providerUsed', 'modelUsed', 'fallbackUsed']) {
    assert.equal(hidden in ownResult.json.data, false, `${hidden} must not be sent to a patient`);
  }

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

  const unrelatedDoctor = await createUser({ suffix: `role-unrelated-doctor-${suffix}`, role: 'Doctor' });
  await linkDoctorToPatient(doctor.user, profile.id);

  const clinicianResult = await api(`/api/ai/patient-summary/${profile.id}`, { token: doctor.token });
  assert.equal(clinicianResult.response.status, 200);
  // A doctor with no appointment or prescription for this patient is denied.
  const unrelatedResult = await api(`/api/ai/patient-summary/${profile.id}`, { token: unrelatedDoctor.token });
  assert.equal(unrelatedResult.response.status, 403);
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

const createAvailableDoctor = async (suffix, offsetDays = 7) => {
  const doctorUser = await createUser({ suffix: `resched-doctor-${suffix}`, role: 'Doctor' });
  const appointmentDate = new Date();
  appointmentDate.setUTCDate(appointmentDate.getUTCDate() + offsetDays);
  appointmentDate.setUTCHours(0, 0, 0, 0);
  const dateText = appointmentDate.toISOString().slice(0, 10);
  const day = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const doctor = await prisma.doctor.create({ data: {
    userId: doctorUser.user.id,
    specialization: 'General Medicine', qualification: 'MBBS', experience: 5,
    licenseNumber: `IT-RESCHED-LIC-${suffix}`, department: 'General Medicine', consultationFee: 500,
    availability: [{ day, slots: [{ startTime: '09:00', endTime: '13:00', isAvailable: true }] }],
  } });
  return { doctorUser, doctor, dateText };
};

test('a receptionist can reschedule a scheduled appointment to a new available slot', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `resched-patient-${suffix}`, role: 'Patient' });
  const receptionist = await createUser({ suffix: `resched-recep-${suffix}`, role: 'Staff', subRole: 'Receptionist' });
  await prisma.patient.create({ data: { userId: patientUser.user.id, patientId: `IT-RESCHED-${suffix}`, allergies: [] } });
  const { doctor, dateText } = await createAvailableDoctor(suffix);

  const booked = await api('/api/appointments', {
    token: patientUser.token, method: 'POST', body: {
      doctor: doctor.id, appointmentDate: dateText, timeSlot: { startTime: '09:00', endTime: '09:30' },
      type: 'Consultation', bookingKey: `resched-booking-${suffix}`,
    },
  });
  assert.equal(booked.response.status, 201);
  const appointmentId = booked.json.data.id;

  const rescheduled = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: receptionist.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '10:00', endTime: '10:30' },
    },
  });
  assert.equal(rescheduled.response.status, 200);
  assert.equal(rescheduled.json.data.timeSlot.startTime, '10:00');

  // The same new time is visible consistently to both the doctor and the patient afterward.
  const doctorView = await api(`/api/appointments/${appointmentId}`, { token: receptionist.token });
  assert.equal(doctorView.json.data.timeSlot.startTime, '10:00');
});

test('rescheduling rejects a past date, a conflicting slot, and an appointment that is not in an eligible state', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `resched-invalid-patient-${suffix}`, role: 'Patient' });
  const receptionist = await createUser({ suffix: `resched-invalid-recep-${suffix}`, role: 'Staff', subRole: 'Receptionist' });
  await prisma.patient.create({ data: { userId: patientUser.user.id, patientId: `IT-RESCHED-INV-${suffix}`, allergies: [] } });
  const { doctor, dateText } = await createAvailableDoctor(suffix);

  const booked = await api('/api/appointments', {
    token: patientUser.token, method: 'POST', body: {
      doctor: doctor.id, appointmentDate: dateText, timeSlot: { startTime: '09:00', endTime: '09:30' },
      type: 'Consultation', bookingKey: `resched-invalid-booking-${suffix}`,
    },
  });
  assert.equal(booked.response.status, 201);
  const appointmentId = booked.json.data.id;

  // A second, already-occupied slot on the same doctor/day to reschedule into.
  const occupied = await api('/api/appointments', {
    token: patientUser.token, method: 'POST', body: {
      doctor: doctor.id, appointmentDate: dateText, timeSlot: { startTime: '11:00', endTime: '11:30' },
      type: 'Consultation', bookingKey: `resched-occupied-booking-${suffix}`,
    },
  });
  assert.equal(occupied.response.status, 201);

  const pastDate = new Date();
  pastDate.setUTCDate(pastDate.getUTCDate() - 3);
  const pastRequest = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: receptionist.token, method: 'PUT', body: {
      appointmentDate: pastDate.toISOString().slice(0, 10), timeSlot: { startTime: '09:00', endTime: '09:30' },
    },
  });
  assert.equal(pastRequest.response.status, 400);
  assert.equal(pastRequest.json.code, 'past_date');

  const conflictRequest = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: receptionist.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '11:00', endTime: '11:30' },
    },
  });
  assert.equal(conflictRequest.response.status, 409);
  assert.equal(conflictRequest.json.code, 'slot_conflict');

  // The original appointment is unchanged after both failed attempts.
  const unchanged = await api(`/api/appointments/${appointmentId}`, { token: receptionist.token });
  assert.equal(unchanged.json.data.timeSlot.startTime, '09:00');

  // Complete the appointment, then confirm a completed appointment is no longer eligible.
  await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'Completed' } });
  const ineligible = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: receptionist.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '12:00', endTime: '12:30' },
    },
  });
  assert.equal(ineligible.response.status, 409);
  assert.equal(ineligible.json.code, 'invalid_status');
});

test('rescheduling is restricted to authorized roles, and a doctor may only reschedule their own appointment', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `resched-auth-patient-${suffix}`, role: 'Patient' });
  const pharmacist = await createUser({ suffix: `resched-auth-pharm-${suffix}`, role: 'Staff', subRole: 'Pharmacist' });
  const otherDoctor = await createUser({ suffix: `resched-auth-otherdoc-${suffix}`, role: 'Doctor' });
  await prisma.patient.create({ data: { userId: patientUser.user.id, patientId: `IT-RESCHED-AUTH-${suffix}`, allergies: [] } });
  const { doctorUser, doctor, dateText } = await createAvailableDoctor(suffix);

  const booked = await api('/api/appointments', {
    token: patientUser.token, method: 'POST', body: {
      doctor: doctor.id, appointmentDate: dateText, timeSlot: { startTime: '09:00', endTime: '09:30' },
      type: 'Consultation', bookingKey: `resched-auth-booking-${suffix}`,
    },
  });
  assert.equal(booked.response.status, 201);
  const appointmentId = booked.json.data.id;

  // The patient who owns the appointment still cannot reschedule it themselves — only staff can.
  const patientAttempt = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: patientUser.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '10:00', endTime: '10:30' },
    },
  });
  assert.equal(patientAttempt.response.status, 403);

  // An unrelated staff role is denied entirely.
  const pharmacistAttempt = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: pharmacist.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '10:00', endTime: '10:30' },
    },
  });
  assert.equal(pharmacistAttempt.response.status, 403);

  // A different doctor (not assigned to this appointment) is denied.
  const otherDoctorAttempt = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: otherDoctor.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '10:00', endTime: '10:30' },
    },
  });
  assert.equal(otherDoctorAttempt.response.status, 403);

  // The assigned doctor may reschedule their own appointment.
  const ownDoctorAttempt = await api(`/api/appointments/${appointmentId}/reschedule`, {
    token: doctorUser.token, method: 'PUT', body: {
      appointmentDate: dateText, timeSlot: { startTime: '10:00', endTime: '10:30' },
    },
  });
  assert.equal(ownDoctorAttempt.response.status, 200);
});

test('AI-derived clinical notes require doctor confirmation and preserve every version', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patient = await createUser({ suffix: `note-patient-${suffix}`, role: 'Patient' });
  const nurse = await createUser({ suffix: `note-nurse-${suffix}`, role: 'Nurse' });
  const doctor = await createUser({ suffix: `note-doctor-${suffix}`, role: 'Doctor' });
  const profile = await prisma.patient.create({ data: {
    userId: patient.user.id, patientId: `IT-NOTE-${suffix}`, allergies: [],
  } });
  // Gives the doctor a care relationship and the patient an active encounter (nurse scope).
  await linkDoctorToPatient(doctor.user, profile.id);
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

// Regression test for a Phase 7 defect: Prescription does not own the FK to
// Appointment (the relation is declared on Appointment.prescriptionId — see
// prisma/schema.prisma, "AppointmentPrescription"), so writing
// `appointmentId` directly on prisma.prescription.create() always threw
// "Unknown argument `appointmentId`" and creating ANY prescription — with or
// without an appointment link — failed with a 500.
test('creating a prescription succeeds with and without a linked appointment', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patientUser = await createUser({ suffix: `rx-patient-${suffix}`, role: 'Patient' });
  const doctorUser = await createUser({ suffix: `rx-doctor-${suffix}`, role: 'Doctor' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id, patientId: `IT-RX-${suffix}`, allergies: [],
  } });
  const doctor = await prisma.doctor.create({ data: {
    userId: doctorUser.user.id,
    specialization: 'General Medicine', qualification: 'MBBS', experience: 5,
    licenseNumber: `IT-RX-LIC-${suffix}`, department: 'General Medicine', consultationFee: 500,
  } });
  // A disposable fixture rather than relying on pre-seeded data, so this
  // test is self-contained regardless of what the target database has
  // already been seeded with.
  const medicine = await prisma.medicine.create({ data: {
    medicineId: `IT-MED-${suffix}`, name: `Integration Test Medicine ${suffix}`,
    genericName: 'Test Compound', manufacturer: 'Integration Labs',
    category: 'Analgesic', dosageForm: 'Tablet', unitPrice: 10,
    stockQuantity: 100, expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
  } });
  fixtureMedicineIds.push(medicine.id);

  const withoutAppointment = await api('/api/prescriptions', {
    token: doctorUser.token, method: 'POST', body: {
      patient: patient.id,
      medicines: [{ medicine: medicine.id, quantity: 10, dosage: '1 tablet', frequency: 'Once daily', duration: '5 days' }],
    },
  });
  assert.equal(withoutAppointment.response.status, 201);
  assert.equal(withoutAppointment.json.data.patient._id, patient.id);

  const appointmentDate = new Date();
  appointmentDate.setUTCDate(appointmentDate.getUTCDate() + 7);
  const appointment = await prisma.appointment.create({ data: {
    patientId: patient.id, doctorId: doctor.id,
    appointmentDate, startTime: '10:00', endTime: '10:30',
    type: 'Consultation', bookingKey: `integration-rx-appt-${suffix}`,
  } });

  const withAppointment = await api('/api/prescriptions', {
    token: doctorUser.token, method: 'POST', body: {
      patient: patient.id, appointment: appointment.id,
      medicines: [{ medicine: medicine.id, quantity: 10, dosage: '1 tablet', frequency: 'Once daily', duration: '5 days' }],
    },
  });
  assert.equal(withAppointment.response.status, 201);

  const linkedAppointment = await prisma.appointment.findUnique({ where: { id: appointment.id } });
  assert.equal(linkedAppointment.prescriptionId, withAppointment.json.data.id);
});

// Regression test for a Phase 7 defect: the pharmacist prescriptions view
// has a "Partially-Filled" (hyphenated) quick-filter tab, but the list
// endpoint passed req.query.status straight into the Prisma `where` filter
// without normalizing it to the enum's real underscored form, so Prisma
// rejected the whole query — a pharmacist clicking that tab got a 500.
test('the prescription list endpoint accepts the hyphenated status filter the UI sends', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pharmacist = await createUser({ suffix: `rx-filter-pharmacist-${suffix}`, role: 'Staff', subRole: 'Pharmacist' });

  const result = await api('/api/prescriptions?status=Partially-Filled', { token: pharmacist.token });
  assert.equal(result.response.status, 200);
  assert.equal(result.json.success, true);
});

// Regression test for a Phase 7 defect: Billing Staff could not create a new
// invoice at all — the "Generate Invoice" patient picker calls
// billingService.getAllPatients(), which hits the same GET /api/patients
// used by every other staff role, but BillingStaff was missing from that
// route's authorize() list. The 403 was swallowed by a bare `catch {}` in
// Billing.jsx, so the dropdown silently rendered "0 available" with no
// visible error. BillingStaff is added alongside the already-present
// Pharmacist/Receptionist/Nurse, who get the same patient list shape for
// their own equivalent lookup needs; unrelated staff-only routes remain
// blocked.
test('billing staff can look up patients to generate an invoice, but not staff records', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const billing = await createUser({ suffix: `billing-patients-${suffix}`, role: 'Staff', subRole: 'BillingStaff' });

  const patients = await api('/api/patients?limit=5', { token: billing.token });
  assert.equal(patients.response.status, 200);
  assert.equal(patients.json.success, true);

  const staffList = await api('/api/staff', { token: billing.token });
  assert.equal(staffList.response.status, 403);
});

// Regression test for a second, compounding Phase 7 defect: every bill
// created by a Staff sub-role that isn't coincidentally also a top-level
// Role enum value (BillingStaff, LabTechnician, RadiologyTechnician,
// WardManager) failed with a 500. billingController.js wrote the more
// specific sub-role string into Billing.createdByRole, a field typed
// against the top-level Prisma Role enum, which does not contain those
// sub-role values — so Billing Staff, whose entire purpose is creating
// bills, could not create one at all.
test('billing staff can create a bill (createdByRole matches the top-level Role enum, not the sub-role)', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const billing = await createUser({ suffix: `billing-create-${suffix}`, role: 'Staff', subRole: 'BillingStaff' });
  const patientUser = await createUser({ suffix: `billing-create-patient-${suffix}`, role: 'Patient' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id, patientId: `IT-BILL-${suffix}`, allergies: [],
  } });

  const result = await api('/api/billing', {
    token: billing.token, method: 'POST', body: {
      patient: patientUser.user.id, billType: 'Other',
      items: [{ description: 'Integration test charge', unitPrice: 100, quantity: 1 }],
    },
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.json.bill.createdByRole, 'Staff');
});

// Regression test for a defect found during the post-pull Stage 1 regression pass:
// the Prisma Billing.paymentStatus enum stores "Partially_Paid" with an underscore
// (like Appointment.status and Prescription.status before them), but the frontend's
// STATUS_COLOR map and paymentStatus equality checks are keyed on the hyphenated
// display form "Partially-Paid" and the list endpoint's status filter passed the
// query value straight into the Prisma `where` clause unnormalized.
test('a partially paid bill accepts the hyphenated status filter the UI would send', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const billing = await createUser({ suffix: `billing-filter-${suffix}`, role: 'Staff', subRole: 'BillingStaff' });
  const patientUser = await createUser({ suffix: `billing-filter-patient-${suffix}`, role: 'Patient' });
  const patient = await prisma.patient.create({ data: {
    userId: patientUser.user.id, patientId: `IT-BILLF-${suffix}`, allergies: [],
  } });

  const created = await api('/api/billing', {
    token: billing.token, method: 'POST', body: {
      patient: patientUser.user.id, billType: 'Other',
      items: [{ description: 'Integration test charge', unitPrice: 200, quantity: 1 }],
    },
  });
  assert.equal(created.response.status, 201);
  const billId = created.json.bill._id || created.json.bill.id;

  const payment = await api(`/api/billing/${billId}/payment`, {
    token: billing.token, method: 'POST', body: { amount: 100, paymentMethod: 'Cash' },
  });
  assert.equal(payment.response.status, 200);
  assert.equal(payment.json.bill.paymentStatus, 'Partially_Paid');

  const filtered = await api('/api/billing?paymentStatus=Partially-Paid', { token: billing.token });
  assert.equal(filtered.response.status, 200);
  assert.ok(filtered.json.bills.some((b) => (b._id || b.id) === billId));
});

test('AI degrades safely, exposes admin-only reliability, and rate limits per user', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const patient = await createUser({ suffix: `ai-patient-${suffix}`, role: 'Patient' });
  const clinician = await createUser({ suffix: `ai-clinician-${suffix}`, role: 'Doctor' });
  const admin = await createUser({ suffix: `ai-admin-${suffix}`, role: 'Admin' });
  const rateUser = await createUser({ suffix: `ai-rate-${suffix}`, role: 'Patient' });
  const previousKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = ''; // blank, not deleted: server.js re-runs dotenv, which would restore a deleted key
  try {
    const degraded = await api('/api/ai/symptom-analysis', {
      token: patient.token, method: 'POST', body: { symptoms: 'mild headache' },
    });
    assert.equal(degraded.response.status, 200);
    // The patient-facing response hides fallback metadata entirely.
    assert.equal('_degraded' in degraded.json.data, false);
    assert.equal('_source' in degraded.json.data, false);
    // Clinicians still see that the deterministic fallback served the request.
    const technical = await api('/api/ai/symptom-analysis', {
      token: clinician.token, method: 'POST', body: { symptoms: 'mild headache' },
    });
    assert.equal(technical.response.status, 200);
    assert.equal(technical.json.data._source, 'rules');
    assert.equal(technical.json.data._degraded, true);

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
  // Technical source assertions use a clinician; patients receive no source metadata.
  const clinical = await createUser({ suffix: `ai-clinical-${suffix}`, role: 'Doctor' });
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
  process.env.OPENROUTER_API_KEY = ''; // blank, not deleted: server.js re-runs dotenv, which would restore a deleted key
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

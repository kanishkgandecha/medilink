'use strict';

// Patients and clinical records: registration, projections, updates,
// archival, medical history (with audit), lab reports, and attachment upload
// edge cases. Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const h = createHarness('patients');
const P = {};
test.before(async () => {
  await h.start();
  P.admin = await h.createUser('admin', 'Admin');
  P.receptionist = await h.createUser('receptionist', 'Staff', 'Receptionist');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.lab = await h.createUser('lab', 'Staff', 'LabTechnician');
  P.doctor = await h.createDoctor('doctor');
  P.patient = await h.createPatient('patient', { allergies: ['Synthetic allergen'], bloodGroup: 'O_POSITIVE' });
  await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
});
test.after(() => h.stop());

const audits = (patientId, action) => h.prisma.clinicalAuditEvent.findMany({ where: { patientId, action } });

test('register patient: validation, success with label-form blood group, and duplicate email', async () => {
  const base = { name: 'Synthetic Registered', email: `integration-p-${h.tag()}@medilink.invalid`, phone: `IT-${h.tag()}` };
  assert.equal((await h.request('/api/patients', { token: P.receptionist.token, method: 'POST', body: { name: 'X' } })).status, 400, 'name+email+phone required');
  assert.equal((await h.request('/api/patients', { token: P.receptionist.token, method: 'POST', body: { ...base, email: 'bad' } })).status, 400);
  assert.equal((await h.request('/api/patients', { token: P.receptionist.token, method: 'POST', body: { ...base, bloodGroup: 'Z+' } })).status, 400);
  assert.equal((await h.request('/api/patients', { token: P.receptionist.token, method: 'POST', body: { ...base, gender: 'Unknown' } })).status, 400);

  // Regression: the UI sends display labels ("A+"); previously this failed with a 500.
  const created = await h.request('/api/patients', { token: P.receptionist.token, method: 'POST', body: { ...base, bloodGroup: 'A+', allergies: ['Synthetic'] } });
  assert.equal(created.status, 201);
  h.trackUser(created.json.data.userId._id);
  assert.equal(created.json.data.bloodGroup, 'A_POSITIVE');
  assert.deepEqual(h.findSensitiveFieldPaths(created.json), []);

  const duplicate = await h.request('/api/patients', { token: P.receptionist.token, method: 'POST', body: { ...base, phone: `IT-${h.tag()}` } });
  assert.equal(duplicate.status, 409);
});

test('patient list: pagination contract, filter validation, and role projections', async () => {
  const paged = await h.request('/api/patients?page=abc&limit=-5', { token: P.admin.token });
  assert.equal(paged.status, 200, 'invalid pagination falls back to defaults');
  assert.equal(paged.json.page, 1);
  const clamped = await h.request('/api/patients?limit=1000', { token: P.admin.token });
  assert.equal(clamped.status, 200);
  assert.ok(clamped.json.data.length <= 100, 'limit clamped to 100');

  assert.equal((await h.request('/api/patients?bloodGroup=NOT_A_GROUP', { token: P.admin.token })).status, 400, 'regression: invalid filter was a 500');
  const filtered = await h.request('/api/patients?bloodGroup=O%2B&limit=100', { token: P.admin.token });
  assert.equal(filtered.status, 200);
  assert.ok(filtered.json.data.every((p) => p.bloodGroup === 'O_POSITIVE'));
  assert.ok(filtered.json.data.some((p) => p._id === P.patient.profile.id));

  const pharmacistRow = (await h.request('/api/patients?limit=100', { token: P.pharmacist.token })).json.data.find((p) => p._id === P.patient.profile.id);
  assert.deepEqual(pharmacistRow.allergies, ['Synthetic allergen']);
  assert.equal('emergencyContact' in pharmacistRow, false);
  assert.equal('email' in pharmacistRow.userId, false);
});

test('patient detail: clinical detail for clinicians/owner, summary for receptionist', async () => {
  const owner = await h.request(`/api/patients/${P.patient.profile.id}`, { token: P.patient.token });
  assert.equal(owner.status, 200);
  assert.ok(Array.isArray(owner.json.data.medicalHistory));
  const receptionist = await h.request(`/api/patients/${P.patient.profile.id}`, { token: P.receptionist.token });
  assert.equal(receptionist.status, 200);
  assert.equal('medicalHistory' in receptionist.json.data, false);
  assert.equal((await h.request(`/api/patients/${crypto.randomUUID()}`, { token: P.admin.token })).status, 404);
  assert.equal((await h.request('/api/patients/not-a-real-id', { token: P.admin.token })).status, 404);
});

test('patient update: validation, label normalization, and owner restrictions', async () => {
  const url = `/api/patients/${P.patient.profile.id}`;
  assert.equal((await h.request(url, { token: P.receptionist.token, method: 'PUT', body: { bloodGroup: 'NOPE' } })).status, 400, 'regression: was a 500');
  assert.equal((await h.request(url, { token: P.receptionist.token, method: 'PUT', body: { allergies: 'not-a-list' } })).status, 400);
  const updated = await h.request(url, { token: P.receptionist.token, method: 'PUT', body: { bloodGroup: 'B-', allergies: ['Synthetic allergen'] } });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.bloodGroup, 'B_NEGATIVE');
  assert.equal((await h.request(url, { token: P.patient.token, method: 'PUT', body: { allergies: [] } })).status, 403);
  assert.equal((await h.request(url, { token: P.patient.token, method: 'PUT', body: { insuranceInfo: { provider: 'Synthetic Insurer' } } })).status, 200);
});

test('medical history: create, amend, void with reason, audit trail, and validation', async () => {
  const base = `/api/patients/${P.patient.profile.id}/medical-history`;
  assert.equal((await h.request(base, { token: P.doctor.token, method: 'POST', body: { condition: 'X', diagnosedDate: '2024-01-01', status: 'Active' } })).status, 400, 'condition too short');
  assert.equal((await h.request(base, { token: P.doctor.token, method: 'POST', body: { condition: 'Synthetic', diagnosedDate: 'yesterday', status: 'Active' } })).status, 400, 'invalid date');
  assert.equal((await h.request(base, { token: P.doctor.token, method: 'POST', body: { condition: 'Synthetic', diagnosedDate: '2024-01-01', status: 'Cured' } })).status, 400, 'invalid status');

  const created = await h.request(base, { token: P.doctor.token, method: 'POST', body: { condition: 'Synthetic hypertension', diagnosedDate: '2024-01-01', status: 'Active' } });
  assert.equal(created.status, 200);
  const item = created.json.data.medicalHistory.find((m) => m.condition === 'Synthetic hypertension');
  assert.ok(item);
  assert.equal((await audits(P.patient.profile.id, 'CREATED')).filter((a) => a.recordId === item.id).length, 1);

  const amended = await h.request(`${base}/${item.id}`, { token: P.doctor.token, method: 'PUT', body: { status: 'Chronic', reason: 'Synthetic correction' } });
  assert.equal(amended.status, 200);
  const amendAudit = (await audits(P.patient.profile.id, 'AMENDED')).find((a) => a.recordId === item.id);
  assert.equal(amendAudit.before.status, 'Active');
  assert.equal(amendAudit.after.status, 'Chronic');

  assert.equal((await h.request(`${base}/${item.id}`, { token: P.doctor.token, method: 'DELETE', body: {} })).status, 400, 'void needs a reason');
  const voided = await h.request(`${base}/${item.id}`, { token: P.doctor.token, method: 'DELETE', body: { reason: 'Synthetic duplicate entry' } });
  assert.equal(voided.status, 200);
  assert.equal(voided.json.data.medicalHistory.some((m) => m.id === item.id), false, 'voided entries are hidden');
  const row = await h.prisma.medicalHistory.findUnique({ where: { id: item.id } });
  assert.equal(row.isVoided, true, 'voided, not deleted');
  assert.equal((await audits(P.patient.profile.id, 'VOIDED')).filter((a) => a.recordId === item.id).length, 1);
  assert.equal((await h.request(`${base}/${item.id}`, { token: P.doctor.token, method: 'PUT', body: { status: 'Active' } })).status, 404, 'voided entry cannot be amended');
});

test('lab reports: validation, modality, audit, and attachment edge cases', async () => {
  const base = `/api/patients/${P.patient.profile.id}/lab-report`;
  assert.equal((await h.request(base, { token: P.lab.token, method: 'POST', body: { testType: 'Blood Test' } })).status, 400, 'testName required');
  assert.equal((await h.request(base, { token: P.lab.token, method: 'POST', body: { testName: 'Synthetic CBC', status: 'Approved' } })).status, 400, 'invalid status');
  const created = await h.request(base, { token: P.lab.token, method: 'POST', body: { testName: 'Synthetic CBC', testType: 'Blood Test', status: 'Verified' } });
  assert.equal(created.status, 200);
  const report = created.json.data.labReports.find((r) => r.testName === 'Synthetic CBC');
  assert.equal((await audits(P.patient.profile.id, 'CREATED')).some((a) => a.recordId === report.id), true);

  const url = `${base}/${report.id}/attachment`;
  assert.equal((await h.upload(url, { token: P.lab.token, filename: 'malware.exe', mimetype: 'application/octet-stream', buffer: Buffer.from('MZ') })).status, 400, 'disallowed extension');
  assert.equal((await h.upload(url, { token: P.lab.token, filename: 'report.pdf', mimetype: 'image/png', buffer: h.PDF_BYTES })).status, 400, 'extension/MIME mismatch');
  assert.equal((await h.upload(url, { token: P.lab.token, buffer: null })).status, 400, 'missing file');
  assert.equal((await h.upload(`${base}/${crypto.randomUUID()}/attachment`, { token: P.lab.token })).status, 404, 'unknown report');
  const ok = await h.upload(url, { token: P.lab.token, filename: 'scan.png', mimetype: 'image/png', buffer: h.PNG_BYTES });
  assert.equal(ok.status, 200);
  const download = await h.request(url, { token: P.patient.token });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'image/png');
  assert.ok(download.buffer.equals(h.PNG_BYTES), 'round-trip content is identical');
  assert.match(download.headers.get('content-disposition') || '', /attachment|inline/);
});

test('patient appointments and stats endpoints for the owner', async () => {
  const appointments = await h.request(`/api/patients/${P.patient.profile.id}/appointments`, { token: P.patient.token });
  assert.equal(appointments.status, 200);
  assert.ok(appointments.json.count >= 1);
  assert.equal((await h.request(`/api/patients/${P.patient.profile.id}/stats`, { token: P.patient.token })).status, 200);
});

test('search: identity-only results and capped query', async () => {
  const res = await h.request(`/api/patients/search?q=${encodeURIComponent(P.patient.profile.patientId)}`, { token: P.receptionist.token });
  assert.equal(res.status, 200);
  const row = res.json.data.find((p) => p._id === P.patient.profile.id);
  assert.ok(row);
  for (const key of ['allergies', 'bloodGroup', 'insuranceInfo', 'emergencyContact', 'medicalHistory']) assert.equal(key in row, false, key);
  assert.equal((await h.request(`/api/patients/search?q=${'x'.repeat(500)}`, { token: P.receptionist.token })).status, 200);
  assert.deepEqual((await h.request('/api/patients/search?q=', { token: P.receptionist.token })).json.data, []);
});

test('archive: occupied bed blocks archival; archival is soft, audited, and blocks login', async () => {
  const password = 'Synthetic-Pass-2026';
  const archivable = await h.createPatient('archivable');
  await h.prisma.user.update({ where: { id: archivable.user.id }, data: { password: await bcrypt.hash(password, 10) } });
  const ward = await h.createWard();
  await h.prisma.bed.update({ where: { id: ward.beds[0].id }, data: { isOccupied: true, patientId: archivable.profile.id, admissionDate: new Date() } });
  assert.equal((await h.request(`/api/patients/${archivable.profile.id}`, { token: P.admin.token, method: 'DELETE', body: { reason: 'Synthetic' } })).status, 409);
  await h.prisma.bed.update({ where: { id: ward.beds[0].id }, data: { isOccupied: false, patientId: null } });

  const archived = await h.request(`/api/patients/${archivable.profile.id}`, { token: P.admin.token, method: 'DELETE', body: { reason: 'Synthetic archival' } });
  assert.equal(archived.status, 200);
  assert.ok((await h.prisma.patient.findUnique({ where: { id: archivable.profile.id } })).archivedAt, 'retained and archived');
  assert.equal((await audits(archivable.profile.id, 'ARCHIVED')).length, 1);
  assert.equal((await h.request('/api/auth/login', { method: 'POST', body: { email: archivable.user.email, password } })).status, 401);
  assert.equal((await h.request(`/api/patients/${archivable.profile.id}`, { token: P.admin.token, method: 'DELETE', body: {} })).status, 200, 'repeat archival is idempotent');
});

test('heal-orphans creates profiles only for patient users that lack one', async () => {
  const orphan = await h.createUser('orphan', 'Patient');
  const res = await h.request('/api/patients/heal-orphans', { token: P.admin.token, method: 'POST' });
  assert.equal(res.status, 200);
  assert.ok(res.json.count >= 1);
  assert.ok(await h.prisma.patient.findUnique({ where: { userId: orphan.user.id } }));
});

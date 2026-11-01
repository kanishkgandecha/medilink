'use strict';

// Read-endpoint edge cases: unknown IDs → 404, invalid enum filters → 400 (not
// a database error), valid filters narrow results, and remaining small
// validation paths. Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const h = createHarness('read-edges');
const P = {};
test.before(async () => {
  await h.start();
  P.admin = await h.createUser('admin', 'Admin');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.doctor = await h.createDoctor('doctor', { specialization: 'Synthetic Specialty', department: 'Synthetic Department' });
  P.patient = await h.createPatient('patient');
});
test.after(() => h.stop());

test('unknown IDs return 404 on detail endpoints', async () => {
  const id = crypto.randomUUID();
  for (const url of [`/api/doctors/${id}`, `/api/doctors/${id}/schedule`, `/api/doctors/${id}/appointments`, `/api/wards/${id}`,
    `/api/medicines/${id}`, `/api/staff/${id}`, `/api/appointments/${id}`, `/api/prescriptions/${id}`, `/api/billing/${id}`,
    `/api/patients/diagnostic-workspace/${id}`, `/api/ai/patient-summary/${id}`]) {
    const token = url.includes('diagnostic-workspace') ? (await h.createUser('lab', 'Staff', 'LabTechnician')).token : P.admin.token;
    assert.equal((await h.request(url, { token })).status, 404, url);
  }
});

test('invalid enum filters are rejected with 400 instead of surfacing a database error', async () => {
  const cases = [
    ['/api/appointments?status=Lost', P.admin], ['/api/appointments?priority=Whenever', P.admin],
    ['/api/prescriptions?status=Lost', P.admin], ['/api/billing?paymentStatus=Lost', P.admin],
    ['/api/medicines?category=Snacks', P.admin], ['/api/wards?wardType=Penthouse', P.admin], ['/api/wards?gender=Robot', P.admin],
    ['/api/reports/ward-usage?wardType=Penthouse', P.admin], ['/api/staff?employmentType=Seasonal', P.admin], ['/api/staff?shift=Midday', P.admin],
    ['/api/appointments?date=not-a-date', P.admin], ['/api/billing/stats?startDate=yesterday&endDate=today', P.admin],
    ['/api/reports/revenue?startDate=x&endDate=y', P.admin], ['/api/prescriptions?startDate=x&endDate=y', P.admin],
  ];
  const failures = [];
  for (const [url, principal] of cases) {
    const { status } = await h.request(url, { token: principal.token });
    if (status !== 400) failures.push(`${url} → ${status}`);
  }
  assert.deepEqual(failures, []);
});

test('valid filters narrow results', async () => {
  const doctors = await h.request('/api/doctors?specialization=Synthetic%20Specialty&limit=100', { token: P.patient.token });
  assert.ok(doctors.json.data.length >= 1);
  assert.ok(doctors.json.data.every((d) => d.specialization === 'Synthetic Specialty'));
  const ward = await h.createWard({ wardType: 'ICU' });
  const icu = await h.request('/api/wards?wardType=ICU', { token: P.admin.token });
  assert.ok(icu.json.data.some((w) => w.id === ward.id));
  assert.ok(icu.json.data.every((w) => w.wardType === 'ICU'));
  await h.createMedicine({ category: 'Respiratory' });
  const meds = await h.request('/api/medicines?category=Respiratory&limit=100', { token: P.pharmacist.token });
  assert.ok(meds.json.data.length >= 1 && meds.json.data.every((m) => m.category === 'Respiratory'));
  assert.equal((await h.request('/api/billing/stats?startDate=2024-01-01&endDate=2024-12-31', { token: P.admin.token })).status, 200);
  assert.equal((await h.request('/api/reports/revenue?paymentStatus=Paid', { token: P.admin.token })).status, 200);
});

test('remaining validation paths: forgot-password email, patient dashboard without a profile', async () => {
  assert.equal((await h.request('/api/auth/forgot-password', { method: 'POST', body: { email: 'not-an-email' } })).status, 400);
  const profileless = await h.createUser('profileless-patient', 'Patient');
  assert.equal((await h.request('/api/dashboards/patient', { token: profileless.token })).status, 404);
});

// ── Remaining documented error paths ────────────────────────────────────
test('clinical notes: review only from Draft (409 otherwise); amend only after review (409 before)', async () => {
  await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
  const base = `/api/patients/${P.patient.profile.id}/clinical-notes`;
  const draft = await h.request(`${base}/drafts`, { token: P.doctor.token, method: 'POST', body: { title: 'Synthetic draft', content: 'Synthetic draft content text.', source: 'ai' } });
  assert.equal(draft.status, 201);
  const noteUrl = `${base}/${draft.json.data.id}`;
  const confirm = { confirmed: true, content: 'Synthetic reviewed content.', amendmentNote: 'Synthetic note' };
  assert.equal((await h.request(`${noteUrl}/amend`, { token: P.doctor.token, method: 'POST', body: confirm })).status, 409, 'cannot amend an unreviewed draft');
  assert.equal((await h.request(`${noteUrl}/review`, { token: P.doctor.token, method: 'POST', body: confirm })).status, 200);
  assert.equal((await h.request(`${noteUrl}/review`, { token: P.doctor.token, method: 'POST', body: confirm })).status, 409, 'cannot review twice');
  assert.equal((await h.request(`${noteUrl}/amend`, { token: P.doctor.token, method: 'POST', body: confirm })).status, 200);
  assert.equal((await h.request(`${noteUrl}/amend`, { token: P.doctor.token, method: 'POST', body: { ...confirm, content: 'Second synthetic amendment.' } })).status, 200, 'further amendments allowed');
});

test('duplicates and missing records on write paths', async () => {
  const other = await h.createDoctor('license-holder');
  assert.equal((await h.request(`/api/doctors/${P.doctor.profile.id}`, { token: P.admin.token, method: 'PUT', body: { licenseNumber: other.profile.licenseNumber } })).status, 409, 'duplicate license on update');
  const med = await h.createMedicine();
  assert.equal((await h.request('/api/medicines', { token: P.pharmacist.token, method: 'POST', body: {
    medicineId: med.medicineId, name: 'Synthetic Dup', genericName: 'X', manufacturer: 'X', category: 'Other', unitPrice: 1, stockQuantity: 1, reorderLevel: 1, expiryDate: '2030-01-01',
  } })).status, 409, 'duplicate medicine ID');
  const bill = await h.prisma.billing.create({ data: { patientId: P.patient.profile.id, subtotal: 10, totalAmount: 10, balance: 10 } });
  assert.equal((await h.request(`/api/billing/${bill.id}/insurance`, { token: P.admin.token, method: 'PUT', body: { status: 'Approved' } })).status, 404, 'no claim to process');
  const day = h.futureDay(10);
  assert.equal((await h.request('/api/appointments', { token: P.patient.token, method: 'POST', body: {
    doctor: crypto.randomUUID(), appointmentDate: day.text, timeSlot: { startTime: '09:00', endTime: '09:30' }, type: 'Consultation',
  } })).status, 404, 'unknown doctor');
  const rx = await h.prisma.prescription.create({ data: { prescriptionId: `IT-RX-${h.tag()}`, patientId: P.patient.profile.id, doctorId: P.doctor.profile.id } });
  assert.equal((await h.request(`/api/prescriptions/${rx.id}/refill`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: 'not-a-uuid' } })).status, 400);
});

test('every AI POST rejects an empty body with 400, and the reliability window is validated', async () => {
  for (const url of ['/api/ai/chat', '/api/ai/symptom-analysis', '/api/ai/report-analysis', '/api/ai/health-risk', '/api/ai/bed-allocation', '/api/ai/appointment-optimizer', '/api/ai/symptom-to-appointment']) {
    assert.equal((await h.request(url, { token: P.admin.token, method: 'POST', body: {} })).status, 400, url);
  }
  assert.equal((await h.request('/api/ai/reliability?hours=0', { token: P.admin.token })).status, 400);
  assert.equal((await h.request('/api/ai/reliability?hours=24', { token: P.admin.token })).status, 200);
});

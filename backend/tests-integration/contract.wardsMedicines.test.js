'use strict';

// Wards/beds (create/update validation, assignment conflicts, idempotent
// discharge billing, archival) and medicines (validation, atomic stock,
// history-preserving deletion). Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const h = createHarness('wards-medicines');
const P = {};
test.before(async () => {
  await h.start();
  P.admin = await h.createUser('admin', 'Admin');
  P.nurse = await h.createUser('nurse', 'Staff', 'Nurse');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.doctor = await h.createDoctor('doctor');
  P.patientA = await h.createPatient('patient-a', { allergies: ['Synthetic allergen'], insuranceInfo: { provider: 'Synthetic' } });
  P.patientB = await h.createPatient('patient-b');
});
test.after(() => h.stop());

// ── Wards ────────────────────────────────────────────────────────────────
test('ward creation: validation, bed generation, and duplicate ward number', async () => {
  const number = `IT-WARD-${h.tag()}`;
  const bad = [
    { wardName: 'Synthetic', totalBeds: 2 },
    { wardNumber: number, wardName: 'Synthetic', totalBeds: 0 },
    { wardNumber: number, wardName: 'Synthetic', totalBeds: 501 },
    { wardNumber: number, wardName: 'Synthetic', totalBeds: 2, wardType: 'Penthouse' },
    { wardNumber: number, wardName: 'Synthetic', totalBeds: 2, dailyRate: -1 },
  ];
  for (const body of bad) assert.equal((await h.request('/api/wards', { token: P.admin.token, method: 'POST', body })).status, 400, JSON.stringify(body));

  const created = await h.request('/api/wards', { token: P.admin.token, method: 'POST', body: { wardNumber: number, wardName: 'Synthetic Ward', totalBeds: 3, wardType: 'ICU', dailyRate: 2000 } });
  assert.equal(created.status, 201);
  h.trackWard(created.json.data.id);
  assert.equal(created.json.data.beds.length, 3);
  assert.equal((await h.request('/api/wards', { token: P.admin.token, method: 'POST', body: { wardNumber: number, wardName: 'Dup', totalBeds: 1 } })).status, 409);
});

test('ward update: validation and success', async () => {
  const ward = await h.createWard();
  assert.equal((await h.request(`/api/wards/${ward.id}`, { token: P.admin.token, method: 'PUT', body: { wardType: 'Penthouse' } })).status, 400, 'regression: invalid enum was a 500');
  const ok = await h.request(`/api/wards/${ward.id}`, { token: P.admin.token, method: 'PUT', body: { wardName: 'Synthetic Renamed', dailyRate: 1500 } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.wardName, 'Synthetic Renamed');
  assert.equal((await h.request(`/api/wards/${crypto.randomUUID()}`, { token: P.admin.token, method: 'PUT', body: { wardName: 'X' } })).status, 404);
});

test('bed assignment: success, replay, occupied bed, double admission, and identity-only occupant data', async () => {
  const ward = await h.createWard();
  const [bed1, bed2] = ward.beds;
  const assign = (patientId, bedId) => h.request(`/api/wards/${ward.id}/assign`, { token: P.nurse.token, method: 'POST', body: { patientId, bedId } });

  const first = await assign(P.patientA.profile.id, bed1.id);
  assert.equal(first.status, 200);
  assert.equal(first.json.replayed, false);
  const occupant = first.json.data.beds.find((b) => b.id === bed1.id).patient;
  for (const key of ['allergies', 'insuranceInfo', 'emergencyContact', 'bloodGroup']) {
    assert.equal(key in occupant, false, `regression: bed occupant exposed ${key}`);
  }
  assert.equal((await assign(P.patientA.profile.id, bed1.id)).json.replayed, true, 'same assignment is idempotent');
  assert.equal((await assign(P.patientB.profile.id, bed1.id)).status, 409, 'occupied bed');
  assert.equal((await assign(P.patientA.profile.id, bed2.id)).status, 409, 'patient already admitted elsewhere');
  assert.equal((await h.request(`/api/wards/${ward.id}/assign`, { token: P.nurse.token, method: 'POST', body: { patientId: P.patientB.profile.id, bedId: bed2.id, admissionDate: '2030-01-02', expectedDischargeDate: '2030-01-01' } })).status, 400, 'discharge before admission');
  assert.equal((await h.request(`/api/wards/${ward.id}`, { token: P.admin.token, method: 'DELETE' })).status, 400, 'cannot archive a ward with occupied beds');

  const key = crypto.randomUUID();
  const discharge = await h.request(`/api/wards/${ward.id}/discharge`, { token: P.nurse.token, method: 'POST', body: { bedId: bed1.id, idempotencyKey: key } });
  assert.equal(discharge.status, 200);
  assert.ok(discharge.json.wardBill, 'ward bill generated');
  const replay = await h.request(`/api/wards/${ward.id}/discharge`, { token: P.nurse.token, method: 'POST', body: { bedId: bed1.id, idempotencyKey: key } });
  assert.equal(replay.json.replayed, true);
  assert.equal(await h.prisma.billing.count({ where: { sourceKey: `bed:${bed1.id}:discharge:${key}` } }), 1, 'exactly one ward bill');
  assert.equal((await h.request(`/api/wards/${ward.id}/discharge`, { token: P.nurse.token, method: 'POST', body: { bedId: bed1.id, idempotencyKey: crypto.randomUUID() } })).status, 409, 'bed not occupied');
  assert.equal((await h.request(`/api/wards/${ward.id}/discharge`, { token: P.nurse.token, method: 'POST', body: { bedId: bed1.id, idempotencyKey: 'not-a-uuid' } })).status, 400);

  const archived = await h.request(`/api/wards/${ward.id}`, { token: P.admin.token, method: 'DELETE' });
  assert.equal(archived.status, 200);
});

test('legacy allocate/release flows use the next free bed and bed number', async () => {
  const ward = await h.createWard();
  const allocated = await h.request(`/api/wards/${ward.id}/allocate`, { token: P.nurse.token, method: 'POST', body: { patientId: P.patientB.profile.id } });
  assert.equal(allocated.status, 200);
  const bed = allocated.json.data.beds.find((b) => b.isOccupied);
  assert.ok(bed);
  const released = await h.request(`/api/wards/${ward.id}/release`, { token: P.nurse.token, method: 'POST', body: { bedNumber: bed.bedNumber, idempotencyKey: crypto.randomUUID() } });
  assert.equal(released.status, 200);
  assert.equal((await h.request(`/api/wards/${ward.id}/allocate`, { token: P.nurse.token, method: 'POST', body: {} })).status, 400, 'patientId required');
  assert.equal((await h.request(`/api/wards/${ward.id}/allocate`, { token: P.nurse.token, method: 'POST', body: { patientId: crypto.randomUUID() } })).status, 404);
});

// ── Medicines ────────────────────────────────────────────────────────────
const medicineBody = (overrides = {}) => ({
  name: `Synthetic Med ${h.tag()}`, genericName: 'Synthetic', manufacturer: 'Synthetic Labs', category: 'Analgesic',
  unitPrice: 5, stockQuantity: 10, reorderLevel: 2, expiryDate: '2030-01-01', ...overrides,
});

test('medicine creation and update: enum and amount validation (regressions: invalid enums were 500s)', async () => {
  const bad = [{ category: 'Snacks' }, { dosageForm: 'Gummy' }, { unitPrice: -1 }, { stockQuantity: -3 }, { expiryDate: 'soon' }];
  for (const overrides of bad) assert.equal((await h.request('/api/medicines', { token: P.pharmacist.token, method: 'POST', body: medicineBody(overrides) })).status, 400, JSON.stringify(overrides));
  const created = await h.request('/api/medicines', { token: P.pharmacist.token, method: 'POST', body: medicineBody() });
  assert.equal(created.status, 201);
  h.trackMedicine(created.json.data.id);
  const url = `/api/medicines/${created.json.data.id}`;
  assert.equal((await h.request(url, { token: P.pharmacist.token, method: 'PUT', body: { category: 'Snacks' } })).status, 400);
  assert.equal((await h.request(url, { token: P.pharmacist.token, method: 'PUT', body: { unitPrice: 'free' } })).status, 400);
  const updated = await h.request(url, { token: P.pharmacist.token, method: 'PUT', body: { unitPrice: 7.5, category: 'Antibiotic' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.unitPrice, 7.5);
});

test('stock: add, reduce, set, insufficient stock, and invalid operations', async () => {
  const medicine = await h.createMedicine({ stockQuantity: 10 });
  const stock = (body) => h.request(`/api/medicines/${medicine.id}/stock`, { token: P.pharmacist.token, method: 'PUT', body });
  assert.equal((await stock({ quantity: 5, operation: 'add' })).json.data.stockQuantity, 15);
  assert.equal((await stock({ quantity: 4, operation: 'reduce' })).json.data.stockQuantity, 11);
  assert.equal((await stock({ quantity: 20, operation: 'reduce' })).status, 400);
  assert.equal((await stock({ quantity: 3, operation: 'set' })).json.data.stockQuantity, 3);
  assert.equal((await stock({ quantity: 1, operation: 'multiply' })).status, 400);
  assert.equal((await stock({ quantity: 0, operation: 'add' })).status, 400);
});

test('stock reduce is atomic under concurrency and never goes negative (regression)', async () => {
  const medicine = await h.createMedicine({ stockQuantity: 5 });
  const results = await Promise.all(Array.from({ length: 6 }, () =>
    h.request(`/api/medicines/${medicine.id}/stock`, { token: P.pharmacist.token, method: 'PUT', body: { quantity: 2, operation: 'reduce' } })));
  const succeeded = results.filter((r) => r.status === 200).length;
  assert.equal(succeeded, 2, 'only two reductions of 2 fit into a stock of 5');
  assert.ok(results.every((r) => r.status === 200 || r.status === 400));
  assert.equal((await h.prisma.medicine.findUnique({ where: { id: medicine.id } })).stockQuantity, 1);
});

test('deleting a prescribed medicine deactivates it and preserves prescription history (regression)', async () => {
  const unused = await h.createMedicine();
  const removed = await h.request(`/api/medicines/${unused.id}`, { token: P.admin.token, method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal(removed.json.deactivated, false);
  assert.equal(await h.prisma.medicine.findUnique({ where: { id: unused.id } }), null);

  const prescribed = await h.createMedicine();
  const rx = await h.prisma.prescription.create({ data: {
    prescriptionId: `IT-RX-${h.tag()}`, patientId: P.patientA.profile.id, doctorId: P.doctor.profile.id,
    medicines: { create: [{ medicineId: prescribed.id, dosage: '1', frequency: 'Daily', duration: '3 days', quantity: 3 }] },
  } });
  const deactivated = await h.request(`/api/medicines/${prescribed.id}`, { token: P.admin.token, method: 'DELETE' });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.json.deactivated, true);
  assert.equal((await h.prisma.medicine.findUnique({ where: { id: prescribed.id } })).isActive, false);
  assert.equal(await h.prisma.prescriptionMedicine.count({ where: { prescriptionId: rx.id } }), 1, 'prescription line retained');
  const catalog = await h.request('/api/medicines?limit=100&search=Synthetic', { token: P.pharmacist.token });
  assert.equal(catalog.json.data.some((m) => m.id === prescribed.id), false, 'deactivated medicine hidden from the active catalog');
});

test('medicine alerts and categories return their documented shapes', async () => {
  await h.createMedicine({ stockQuantity: 1, reorderLevel: 50, expiryDate: new Date(Date.now() + 10 * 86400000) });
  await h.createMedicine({ expiryDate: new Date(Date.now() - 86400000) });
  const low = await h.request('/api/medicines/alerts/low-stock', { token: P.pharmacist.token });
  assert.equal(low.status, 200);
  assert.ok(low.json.count >= 1);
  assert.ok((await h.request('/api/medicines/alerts/expiring', { token: P.pharmacist.token })).json.count >= 1);
  assert.ok((await h.request('/api/medicines/alerts/expired', { token: P.pharmacist.token })).json.count >= 1);
  assert.ok(Array.isArray((await h.request('/api/medicines/categories', { token: P.nurse.token })).json.data));
});

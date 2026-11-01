'use strict';

// Prescriptions (create validation, idempotent dispensing with stock/bill
// side effects, refills, cancellation) and billing (validation, payments,
// simulated self-pay, insurance claims, deletion). Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const h = createHarness('rx-billing');
const P = {};
test.before(async () => {
  await h.start();
  P.admin = await h.createUser('admin', 'Admin');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.billing = await h.createUser('billing', 'Staff', 'BillingStaff');
  P.doctor = await h.createDoctor('doctor');
  P.otherDoctor = await h.createDoctor('other-doctor');
  P.patient = await h.createPatient('patient', { allergies: ['Synthetic allergen'], insuranceInfo: { provider: 'Synthetic' } });
  P.otherPatient = await h.createPatient('other-patient');
});
test.after(() => h.stop());

const createRx = (medicines, extra = {}) => h.request('/api/prescriptions', { token: P.doctor.token, method: 'POST', body: { patient: P.patient.profile.id, medicines, ...extra } });
const line = (medicine, quantity = 4) => ({ medicine: medicine.id, quantity, dosage: '1 tablet', frequency: 'Twice daily', duration: '2 days' });

// ── Prescriptions ────────────────────────────────────────────────────────
test('prescription creation: validation, ownership of linked appointment, and success', async () => {
  const med = await h.createMedicine();
  assert.equal((await createRx([])).status, 400, 'at least one medicine');
  assert.equal((await createRx([{ ...line(med), quantity: 0 }])).status, 400, 'positive quantity');
  assert.equal((await createRx([{ ...line(med), dosage: '' }])).status, 400, 'dosage required');
  assert.equal((await createRx([line(med), line(med)])).status, 400, 'duplicate medicine');
  assert.equal((await createRx([line(med)], { refillsAllowed: 13 })).status, 400, 'refills capped at 12');
  assert.equal((await h.request('/api/prescriptions', { token: P.doctor.token, method: 'POST', body: { patient: crypto.randomUUID(), medicines: [line(med)] } })).status, 404);
  const foreign = await h.createAppointment(P.patient.profile.id, P.otherDoctor.profile.id);
  assert.equal((await createRx([line(med)], { appointment: foreign.id })).status, 400, "another doctor's appointment");
  const created = await createRx([line(med)]);
  assert.equal(created.status, 201);
  assert.equal(created.json.data.status, 'Pending');
});

test('prescription detail is minimal: identity plus allergies, no insurance', async () => {
  const med = await h.createMedicine();
  const created = await createRx([line(med)]);
  const detail = await h.request(`/api/prescriptions/${created.json.data.id}`, { token: P.patient.token });
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.json.data.patient.allergies, ['Synthetic allergen']);
  assert.equal('insuranceInfo' in detail.json.data.patient, false);
  assert.deepEqual(h.findSensitiveFieldPaths(detail.json), []);
});

test('dispensing: over-dispense rejected, partial then full, idempotent replay, stock and bill side effects', async () => {
  const med = await h.createMedicine({ stockQuantity: 50, unitPrice: 10 });
  const rx = (await createRx([line(med, 4)])).json.data;
  const dispense = (qty, key = crypto.randomUUID()) => h.request(`/api/prescriptions/${rx.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: key, items: [{ medicineId: med.id, dispensedQuantity: qty }] } });

  assert.equal((await dispense(5)).status, 409, 'cannot exceed prescribed quantity');
  assert.equal((await h.request(`/api/prescriptions/${rx.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: 'nope', items: [{ medicineId: med.id, dispensedQuantity: 1 }] } })).status, 400);
  assert.equal((await h.request(`/api/prescriptions/${rx.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: crypto.randomUUID(), items: [{ medicineId: crypto.randomUUID(), dispensedQuantity: 1 }] } })).status, 400, 'medicine not on prescription');

  const key = crypto.randomUUID();
  const partial = await dispense(1, key);
  assert.equal(partial.status, 200);
  assert.equal(partial.json.data.status, 'Partially_Filled');
  const replay = await dispense(1, key);
  assert.equal(replay.json.replayed, true);
  assert.equal(replay.json.bill.id, partial.json.bill.id, 'same bill returned');
  assert.equal((await h.prisma.medicine.findUnique({ where: { id: med.id } })).stockQuantity, 49, 'stock decremented once');

  const full = await dispense(3);
  assert.equal(full.json.data.status, 'Fulfilled');
  assert.equal((await dispense(1)).status, 409, 'fulfilled prescription cannot be dispensed again');
  assert.equal(await h.prisma.billing.count({ where: { patientId: P.patient.profile.id, billType: 'Pharmacy', sourceKey: { startsWith: `prescription:${rx.id}:dispense:` } } }), 2);
});

test('dispensing with insufficient stock is rejected without partial side effects', async () => {
  const med = await h.createMedicine({ stockQuantity: 1 });
  const rx = (await createRx([line(med, 3)])).json.data;
  const res = await h.request(`/api/prescriptions/${rx.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: crypto.randomUUID(), items: [{ medicineId: med.id, dispensedQuantity: 3 }] } });
  assert.equal(res.status, 409);
  assert.equal((await h.prisma.medicine.findUnique({ where: { id: med.id } })).stockQuantity, 1, 'rolled back');
  assert.equal((await h.prisma.prescription.findUnique({ where: { id: rx.id } })).status, 'Pending');
});

test('refills: only fulfilled prescriptions, limited by refillsAllowed, idempotent', async () => {
  const med = await h.createMedicine({ stockQuantity: 50 });
  const rx = (await createRx([line(med, 2)], { refillsAllowed: 1 })).json.data;
  const refill = (key = crypto.randomUUID()) => h.request(`/api/prescriptions/${rx.id}/refill`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: key } });
  assert.equal((await refill()).status, 409, 'not fulfilled yet');
  await h.request(`/api/prescriptions/${rx.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: crypto.randomUUID(), items: [{ medicineId: med.id, dispensedQuantity: 2 }] } });
  const key = crypto.randomUUID();
  assert.equal((await refill(key)).status, 200);
  assert.equal((await refill(key)).json.replayed, true);
  assert.equal((await refill()).status, 409, 'no refills left');
});

test('cancellation: pending only; prescribing doctor or admin', async () => {
  const med = await h.createMedicine();
  const rx = (await createRx([line(med)])).json.data;
  assert.equal((await h.request(`/api/prescriptions/${rx.id}/cancel`, { token: P.doctor.token, method: 'PUT' })).status, 200);
  assert.equal((await h.request(`/api/prescriptions/${rx.id}/cancel`, { token: P.doctor.token, method: 'PUT' })).status, 200, 'Cancelled→Cancelled is a no-op transition');
  assert.equal((await h.request(`/api/prescriptions/${crypto.randomUUID()}/cancel`, { token: P.admin.token, method: 'PUT' })).status, 404);
  const dispensed = (await createRx([line(med, 1)])).json.data;
  await h.request(`/api/prescriptions/${dispensed.id}/dispense`, { token: P.pharmacist.token, method: 'POST', body: { idempotencyKey: crypto.randomUUID(), items: [{ medicineId: med.id, dispensedQuantity: 1 }] } });
  assert.equal((await h.request(`/api/prescriptions/${dispensed.id}/cancel`, { token: P.admin.token, method: 'PUT' })).status, 409, 'fulfilled prescriptions cannot be cancelled');
});

// ── Billing ──────────────────────────────────────────────────────────────
const createBill = (token, body) => h.request('/api/billing', { token, method: 'POST', body: { patient: P.patient.user.id, items: [{ description: 'Synthetic service', unitPrice: 100, quantity: 2 }], ...body } });

test('bill creation: validation, discount bounds, category enum, pharmacist restriction', async () => {
  const bad = [
    [{ items: [] }, 'no items'],
    [{ items: [{ description: 'X', unitPrice: -1, quantity: 1 }] }, 'negative price'],
    [{ items: [{ description: 'X', unitPrice: 10, quantity: 0 }] }, 'zero quantity'],
    [{ items: [{ description: 'X', unitPrice: 10, quantity: 1, category: 'Snacks' }] }, 'regression: invalid category was a 500'],
    [{ discount: -5 }, 'negative discount'],
    [{ discount: 1000 }, 'regression: discount above subtotal produced a negative bill'],
    [{ paymentMethod: 'Barter' }, 'invalid payment method'],
  ];
  for (const [body, label] of bad) assert.equal((await createBill(P.billing.token, body)).status, 400, label);
  assert.equal((await createBill(P.pharmacist.token, { billType: 'Consultation' })).status, 403, 'pharmacists create Pharmacy bills only');
  assert.equal((await h.request('/api/billing', { token: P.billing.token, method: 'POST', body: { patient: P.doctor.user.id, items: [{ description: 'X', unitPrice: 1, quantity: 1 }] } })).status, 404, 'target must be a patient user');

  const ok = await createBill(P.billing.token, { discount: 50, tax: 10, items: [{ description: 'Synthetic', unitPrice: 100, quantity: 2, category: 'Lab_Test' }] });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.bill.totalAmount, 160);
  for (const key of ['allergies', 'emergencyContact', 'bloodGroup']) assert.equal(key in ok.json.bill.patient, false, key);
  assert.deepEqual(h.findSensitiveFieldPaths(ok.json), []);
});

test('payments: validation, overpayment conflict, partial then paid', async () => {
  const bill = (await createBill(P.billing.token, {})).json.bill;
  const pay = (body) => h.request(`/api/billing/${bill.id}/payment`, { token: P.billing.token, method: 'POST', body });
  assert.equal((await pay({ amount: 0, paymentMethod: 'Cash' })).status, 400);
  assert.equal((await pay({ amount: 10, paymentMethod: 'Gold' })).status, 400);
  assert.equal((await pay({ amount: 500, paymentMethod: 'Cash' })).status, 409);
  assert.equal((await pay({ amount: 50, paymentMethod: 'UPI' })).json.bill.paymentStatus, 'Partially_Paid');
  const paid = await pay({ amount: 150, paymentMethod: 'Card' });
  assert.equal(paid.json.bill.paymentStatus, 'Paid');
  assert.equal(paid.json.bill.balance, 0);
  assert.equal((await h.request(`/api/billing/${bill.id}`, { token: P.admin.token, method: 'DELETE' })).status, 400, 'paid bills cannot be deleted');
});

test('patient self-pay is simulated, owner-only, and single-shot', async () => {
  const bill = (await createBill(P.billing.token, {})).json.bill;
  assert.equal((await h.request(`/api/billing/${bill.id}/pay`, { token: P.patient.token, method: 'POST', body: {} })).status, 400);
  const res = await h.request(`/api/billing/${bill.id}/pay`, { token: P.patient.token, method: 'POST', body: { paymentMethod: 'UPI' } });
  assert.equal(res.status, 200);
  assert.equal(res.json.simulated, true);
  assert.equal(res.json.bill.paymentStatus, 'Paid');
  assert.equal((await h.request(`/api/billing/${bill.id}/pay`, { token: P.patient.token, method: 'POST', body: { paymentMethod: 'UPI' } })).status, 409);
});

test('insurance: validation, balance bound, single active claim, approval bounds, rejection allows resubmission', async () => {
  const bill = (await createBill(P.billing.token, {})).json.bill;
  const submit = (body) => h.request(`/api/billing/${bill.id}/insurance`, { token: P.billing.token, method: 'POST', body });
  const processClaim = (body) => h.request(`/api/billing/${bill.id}/insurance`, { token: P.admin.token, method: 'PUT', body });
  assert.equal((await submit({ provider: 'Synthetic', amountClaimed: 50 })).status, 400);
  assert.equal((await submit({ claimNumber: 'IT-1', provider: 'Synthetic', amountClaimed: 999 })).status, 400, 'exceeds balance');
  assert.equal((await submit({ claimNumber: 'IT-1', provider: 'Synthetic', amountClaimed: 120 })).status, 200);
  assert.equal((await submit({ claimNumber: 'IT-2', provider: 'Synthetic', amountClaimed: 10 })).status, 409, 'one active claim');
  assert.equal((await processClaim({ status: 'Maybe' })).status, 400);
  assert.equal((await processClaim({ status: 'Rejected', rejectionReason: 'Synthetic' })).status, 200);
  assert.equal((await submit({ claimNumber: 'IT-3', provider: 'Synthetic', amountClaimed: 100 })).status, 200, 'resubmission after rejection');
  assert.equal((await processClaim({ status: 'Approved', approvedAmount: 150 })).status, 400, 'cannot approve more than claimed');
  const approved = await processClaim({ status: 'Approved', approvedAmount: 100 });
  assert.equal(approved.status, 200);
  assert.equal(approved.json.bill.amountPaid, 100);
  assert.equal((await processClaim({ status: 'Rejected' })).status, 409, 'processed claims are final');
});

test('bill detail scoping and deletion of unpaid bills', async () => {
  const consult = (await createBill(P.billing.token, { billType: 'Consultation' })).json.bill;
  assert.equal((await h.request(`/api/billing/${consult.id}`, { token: P.pharmacist.token })).status, 403, 'pharmacists see pharmacy bills only');
  assert.equal((await h.request(`/api/billing/${consult.id}`, { token: P.otherPatient.token })).status, 403);
  assert.equal((await h.request(`/api/billing/${consult.id}`, { token: P.patient.token })).status, 200);
  assert.equal((await h.request(`/api/billing/${consult.id}`, { token: P.admin.token, method: 'DELETE' })).status, 200);
  assert.equal((await h.request(`/api/billing/${consult.id}`, { token: P.admin.token, method: 'DELETE' })).status, 404);
  const own = await h.request('/api/billing', { token: P.patient.token });
  assert.ok(own.json.bills.every((b) => b.patientId === P.patient.profile.id));
});

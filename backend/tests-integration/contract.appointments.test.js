'use strict';

// Appointments: availability, booking validation/conflicts, the status state
// machine (incl. single consultation bill on completion), cancellation, and
// list scoping. Synthetic data only.

const { createHarness } = require('./support/harness');
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const h = createHarness('appointments');
const P = {};
let day;
test.before(async () => {
  await h.start();
  day = h.futureDay(9);
  P.admin = await h.createUser('admin', 'Admin');
  P.receptionist = await h.createUser('receptionist', 'Staff', 'Receptionist');
  P.doctor = await h.createDoctor('doctor', { availability: [{ day: day.weekday, slots: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }] }] });
  P.otherDoctor = await h.createDoctor('other-doctor');
  P.patient = await h.createPatient('patient');
  P.otherPatient = await h.createPatient('other-patient');
});
test.after(() => h.stop());

const book = (token, overrides = {}) => h.request('/api/appointments', { token, method: 'POST', body: {
  doctor: P.doctor.profile.id, appointmentDate: day.text, timeSlot: { startTime: '09:00', endTime: '09:30' }, type: 'Consultation', ...overrides,
} });

test('availability: required date, unknown doctor, inactive doctor, and success', async () => {
  assert.equal((await h.request(`/api/appointments/availability/${P.doctor.profile.id}`, { token: P.patient.token })).status, 400);
  assert.equal((await h.request(`/api/appointments/availability/${crypto.randomUUID()}?date=${day.text}`, { token: P.patient.token })).status, 404);
  const inactive = await h.createDoctor('inactive-doctor', { isAvailable: false });
  assert.equal((await h.request(`/api/appointments/availability/${inactive.profile.id}?date=${day.text}`, { token: P.patient.token })).status, 409);
  const ok = await h.request(`/api/appointments/availability/${P.doctor.profile.id}?date=${day.text}`, { token: P.patient.token });
  assert.equal(ok.status, 200);
});

test('booking validation: bad date, inverted/invalid slots, invalid type and priority, malformed patient id', async () => {
  const cases = [
    [{ appointmentDate: '2026-13-45' }, 400],
    [{ timeSlot: { startTime: '10:00', endTime: '09:30' } }, 400],
    [{ timeSlot: { startTime: '9am', endTime: '10am' } }, 400],
    [{ type: 'Checkup' }, 400],
    [{ priority: 'Whenever' }, 400],
    [{ bookingKey: 'short' }, 400],
  ];
  for (const [overrides, status] of cases) assert.equal((await book(P.patient.token, overrides)).status, status, JSON.stringify(overrides));
  assert.equal((await book(P.receptionist.token, { patient: 'not-a-uuid' })).status, 400, 'staff must send a valid patient id');
  assert.equal((await book(P.receptionist.token, {})).status, 400, 'staff must send a patient id');
});

test('booking business rules: past date, off-schedule, unconfigured schedule, non-30-minute slot, conflict', async () => {
  const past = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  assert.equal((await book(P.patient.token, { appointmentDate: past })).json.code, 'past_date');
  assert.equal((await book(P.patient.token, { timeSlot: { startTime: '15:00', endTime: '15:30' } })).json.code, 'outside_doctor_schedule');
  assert.equal((await book(P.patient.token, { doctor: P.otherDoctor.profile.id })).json.code, 'schedule_not_configured');
  assert.equal((await book(P.patient.token, { timeSlot: { startTime: '09:00', endTime: '10:00' } })).json.code, 'invalid_time_slot');

  const first = await book(P.patient.token, { timeSlot: { startTime: '10:00', endTime: '10:30' }, bookingKey: `integration-${h.tag()}` });
  assert.equal(first.status, 201);
  const conflict = await book(P.otherPatient.token, { timeSlot: { startTime: '10:00', endTime: '10:30' } });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json.code, 'slot_conflict');
});

test('a patient always books for themself even when another patient id is supplied', async () => {
  const res = await book(P.patient.token, { patient: P.otherPatient.profile.id, timeSlot: { startTime: '11:00', endTime: '11:30' } });
  assert.equal(res.status, 201);
  const row = await h.prisma.appointment.findUnique({ where: { id: res.json.data.id } });
  assert.equal(row.patientId, P.patient.profile.id);
});

test('state machine: invalid jumps are 409; full lifecycle creates exactly one consultation bill', async () => {
  const appt = await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
  const url = `/api/appointments/${appt.id}`;
  assert.equal((await h.request(url, { token: P.doctor.token, method: 'PUT', body: { status: 'Completed' } })).status, 409);
  assert.equal((await h.request(url, { token: P.doctor.token, method: 'PUT', body: { status: 'Finished' } })).status, 400);
  for (const status of ['Confirmed', 'In-Progress', 'Completed']) {
    const res = await h.request(url, { token: P.doctor.token, method: 'PUT', body: { status } });
    assert.equal(res.status, 200, status);
  }
  assert.equal((await h.request(url, { token: P.doctor.token, method: 'PUT', body: { status: 'Completed' } })).status, 200, 'idempotent re-completion');
  const bills = await h.prisma.billing.findMany({ where: { sourceKey: `appointment:${appt.id}:consultation` } });
  assert.equal(bills.length, 1, 'exactly one consultation bill');
  assert.equal(bills[0].totalAmount, 500);
  assert.equal((await h.request(url, { token: P.doctor.token, method: 'PUT', body: { status: 'Scheduled' } })).status, 409, 'terminal state cannot reopen');
  assert.equal((await h.request(`${url}/cancel`, { token: P.patient.token, method: 'PUT', body: {} })).status, 409, 'completed appointment cannot be cancelled');
});

test('update rejects moving onto an occupied slot and leaves the appointment unchanged', async () => {
  const a = await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
  const b = await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
  const res = await h.request(`/api/appointments/${a.id}`, { token: P.receptionist.token, method: 'PUT', body: { appointmentDate: b.appointmentDate.toISOString(), timeSlot: { startTime: b.startTime, endTime: b.endTime } } });
  assert.equal(res.status, 400);
  assert.equal((await h.prisma.appointment.findUnique({ where: { id: a.id } })).startTime, a.startTime);
});

test('cancellation by the owning patient records the reason', async () => {
  const appt = await h.createAppointment(P.patient.profile.id, P.doctor.profile.id);
  const res = await h.request(`/api/appointments/${appt.id}/cancel`, { token: P.patient.token, method: 'PUT', body: { reason: 'Synthetic conflict' } });
  assert.equal(res.status, 200);
  const row = await h.prisma.appointment.findUnique({ where: { id: appt.id } });
  assert.equal(row.status, 'Cancelled');
  assert.equal(row.cancelReason, 'Synthetic conflict');
  assert.equal((await h.request(`/api/appointments/${appt.id}/cancel`, { token: P.patient.token, method: 'PUT', body: { reason: 5 } })).status, 400, 'reason must be a string');
});

test('list scoping: patients and doctors only see their own appointments; list never exposes patient profile fields', async () => {
  await h.createAppointment(P.otherPatient.profile.id, P.otherDoctor.profile.id);
  const patientList = await h.request('/api/appointments', { token: P.patient.token });
  assert.ok(patientList.json.data.every((a) => a.patientId === P.patient.profile.id));
  const doctorList = await h.request('/api/appointments', { token: P.doctor.token });
  assert.ok(doctorList.json.data.every((a) => a.doctorId === P.doctor.profile.id));
  const staffList = await h.request('/api/appointments', { token: P.receptionist.token });
  for (const appointment of staffList.json.data) {
    for (const key of ['allergies', 'insuranceInfo', 'emergencyContact', 'bloodGroup']) assert.equal(key in (appointment.patient || {}), false, key);
  }
  const filtered = await h.request('/api/appointments?status=In-Progress', { token: P.admin.token });
  assert.equal(filtered.status, 200, 'hyphenated status filter accepted');
});

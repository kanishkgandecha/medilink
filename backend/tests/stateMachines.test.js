const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAppointmentStatus,
  canTransitionAppointment,
  normalizePrescriptionStatus,
  canTransitionPrescription,
} = require('../utils/stateMachines');

test('appointment status aliases normalize to Prisma enum values', () => {
  assert.equal(normalizeAppointmentStatus('In-Progress'), 'In_Progress');
  assert.equal(normalizeAppointmentStatus('No-Show'), 'No_Show');
});

test('appointment state machine accepts normal forward transitions', () => {
  assert.equal(canTransitionAppointment('Scheduled', 'Confirmed'), true);
  assert.equal(canTransitionAppointment('Confirmed', 'In-Progress'), true);
  assert.equal(canTransitionAppointment('In_Progress', 'Completed'), true);
});

test('appointment state machine rejects reopening terminal states', () => {
  assert.equal(canTransitionAppointment('Completed', 'Scheduled'), false);
  assert.equal(canTransitionAppointment('Cancelled', 'Confirmed'), false);
  assert.equal(canTransitionAppointment('No_Show', 'Scheduled'), false);
});

test('prescription transitions are controlled by dispensing progress', () => {
  assert.equal(normalizePrescriptionStatus('Partially-Filled'), 'Partially_Filled');
  assert.equal(canTransitionPrescription('Pending', 'Partially_Filled'), true);
  assert.equal(canTransitionPrescription('Partially_Filled', 'Fulfilled'), true);
  assert.equal(canTransitionPrescription('Partially_Filled', 'Cancelled'), false);
  assert.equal(canTransitionPrescription('Fulfilled', 'Pending'), false);
});

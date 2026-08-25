'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBookingWindow, minutes } = require('../services/appointmentBookingService');

const mondaySchedule = [{ day: 'Monday', slots: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }] }];
const fixedNow = new Date('2026-08-24T08:00:00.000Z');

test('booking window accepts a 30-minute slot inside configured availability', () => {
  const result = validateBookingWindow({ appointmentDate: '2026-08-24', startTime: '09:30', endTime: '10:00',
    availability: mondaySchedule, now: fixedNow });
  assert.ok(result.date instanceof Date);
});

test('booking window rejects past, off-schedule, and non-30-minute slots', () => {
  assert.equal(validateBookingWindow({ appointmentDate: '2026-08-23', startTime: '09:00', endTime: '09:30', availability: mondaySchedule, now: fixedNow }).error, 'past_date');
  assert.equal(validateBookingWindow({ appointmentDate: '2026-08-24', startTime: '13:00', endTime: '13:30', availability: mondaySchedule, now: fixedNow }).error, 'outside_doctor_schedule');
  assert.equal(validateBookingWindow({ appointmentDate: '2026-08-24', startTime: '09:00', endTime: '10:00', availability: mondaySchedule, now: fixedNow }).error, 'invalid_time_slot');
});

test('booking requires a configured schedule and valid clock values', () => {
  assert.equal(validateBookingWindow({ appointmentDate: '2026-08-24', startTime: '09:00', endTime: '09:30', availability: [], now: fixedNow }).error, 'schedule_not_configured');
  assert.equal(minutes('25:00'), null);
  assert.equal(minutes('09:30'), 570);
});

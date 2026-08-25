'use strict';
const prisma = require('../config/prisma');
const { runSerializableTransaction } = require('../utils/transactions');
const crypto = require('crypto');

const ACTIVE_SLOT_STATUSES = ['Scheduled', 'Confirmed', 'In_Progress'];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const minutes = (value) => {
  const match = String(value || '').match(TIME_PATTERN);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

function validateBookingWindow({ appointmentDate, startTime, endTime, availability, now = new Date() }) {
  const date = new Date(appointmentDate);
  if (Number.isNaN(date.getTime())) return { error: 'invalid_date' };
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maximum = new Date(today);
  maximum.setUTCFullYear(maximum.getUTCFullYear() + 1);
  if (date < today) return { error: 'past_date' };
  if (date > maximum) return { error: 'date_too_far' };

  const start = minutes(startTime);
  const end = minutes(endTime);
  if (start === null || end === null || end - start !== 30) return { error: 'invalid_time_slot' };

  const schedules = Array.isArray(availability) ? availability : [];
  if (!schedules.length) return { error: 'schedule_not_configured' };
  const day = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
  const daySchedule = schedules.find((entry) => String(entry?.day || '').toLowerCase() === day);
  const withinSchedule = daySchedule?.slots?.some((slot) => {
    const slotStart = minutes(slot.startTime);
    const slotEnd = minutes(slot.endTime);
    return slot.isAvailable === true && slotStart !== null && slotEnd !== null && start >= slotStart && end <= slotEnd;
  });
  return withinSchedule ? { date } : { error: 'outside_doctor_schedule' };
}

async function bookAppointmentTransaction(input) {
  try {
    return await runSerializableTransaction(async (tx) => {
      if (input.bookingKey) {
        const replay = await tx.appointment.findUnique({ where: { bookingKey: input.bookingKey },
          include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } });
        if (replay) return { appointment: replay, replayed: true };
      }

      const patient = await tx.patient.findFirst({
        where: { OR: [{ id: input.patientIdentifier }, { legacyMongoId: input.patientIdentifier }] }, include: { user: true },
      });
      if (!patient) return { error: 'patient_not_found' };
      if (patient.archivedAt || !patient.user?.isActive) return { error: 'patient_inactive' };

      const doctor = await tx.doctor.findFirst({
        where: { OR: [{ id: input.doctorIdentifier }, { legacyMongoId: input.doctorIdentifier }] }, include: { user: true },
      });
      if (!doctor) return { error: 'doctor_not_found' };
      if (!doctor.isAvailable || !doctor.user?.isActive) return { error: 'doctor_inactive' };

      const window = validateBookingWindow({ appointmentDate: input.appointmentDate,
        startTime: input.startTime, endTime: input.endTime, availability: doctor.availability });
      if (window.error) return window;

      const conflict = await tx.appointment.findFirst({ where: { doctorId: doctor.id,
        appointmentDate: window.date, startTime: input.startTime, status: { in: ACTIVE_SLOT_STATUSES } }, select: { id: true } });
      if (conflict) return { error: 'slot_conflict' };

      const appointment = await tx.appointment.create({ data: {
        appointmentId: `APT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        bookingKey: input.bookingKey || null,
        patientId: patient.id, doctorId: doctor.id, appointmentDate: window.date,
        startTime: input.startTime, endTime: input.endTime,
        type: input.type === 'Follow-up' ? 'Follow_up' : input.type,
        symptoms: input.symptoms || null, priority: input.priority || 'Normal', createdById: input.createdById,
      }, include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } });
      return { appointment, replayed: false };
    });
  } catch (error) {
    if (error.code === 'P2002') return { error: 'slot_conflict' };
    throw error;
  }
}

async function rescheduleAppointmentTransaction({ appointmentIdentifier, appointmentDate, startTime, endTime }) {
  try {
    return await runSerializableTransaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: { OR: [{ id: appointmentIdentifier }, { legacyMongoId: appointmentIdentifier }] },
      });
      if (!appointment) return { error: 'appointment_not_found' };
      if (!['Scheduled', 'Confirmed'].includes(appointment.status)) return { error: 'invalid_status' };
      const doctor = await tx.doctor.findUnique({ where: { id: appointment.doctorId }, include: { user: true } });
      if (!doctor?.isAvailable || !doctor.user?.isActive) return { error: 'doctor_inactive' };
      const window = validateBookingWindow({ appointmentDate, startTime, endTime, availability: doctor.availability });
      if (window.error) return window;
      const conflict = await tx.appointment.findFirst({ where: { doctorId: doctor.id, appointmentDate: window.date,
        startTime, id: { not: appointment.id }, status: { in: ACTIVE_SLOT_STATUSES } }, select: { id: true } });
      if (conflict) return { error: 'slot_conflict' };
      const updated = await tx.appointment.update({ where: { id: appointment.id }, data: {
        appointmentDate: window.date, startTime, endTime, status: 'Scheduled',
      }, include: { patient: { include: { user: true } }, doctor: { include: { user: true } } } });
      return { appointment: updated };
    });
  } catch (error) {
    if (error.code === 'P2002') return { error: 'slot_conflict' };
    throw error;
  }
}

module.exports = { bookAppointmentTransaction, rescheduleAppointmentTransaction, validateBookingWindow, minutes, ACTIVE_SLOT_STATUSES };

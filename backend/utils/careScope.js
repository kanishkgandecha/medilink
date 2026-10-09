'use strict';
const prisma = require('../config/prisma');

// Care-relationship scoping derived from data the schema actually stores.
//
// Doctor: a doctor is in a care relationship with a patient when they share a
//   non-cancelled appointment or a prescription.
// Nurse: there is no reliable nurse↔patient or nurse↔ward assignment
//   (Ward.nurseInChargeId is optional, single-valued, and unset in seed data),
//   so a nurse is scoped to patients with an *active encounter*: currently
//   occupying a bed, or holding a Scheduled/Confirmed/In-Progress appointment.

const ACTIVE_APPOINTMENT_STATUSES = ['Scheduled', 'Confirmed', 'In_Progress'];

const normalize = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();
const isDoctorUser = (user) => normalize(user?.role) === 'doctor';
const isNurseUser = (user) => normalize(user?.role) === 'nurse' || normalize(user?.subRole) === 'nurse';

const getDoctorProfileId = async (userId) => {
  const doctor = await prisma.doctor.findFirst({ where: { userId }, select: { id: true } });
  return doctor?.id || null;
};

const doctorCareWhere = (doctorId) => ({
  OR: [
    { appointments: { some: { doctorId, status: { not: 'Cancelled' } } } },
    { prescriptions: { some: { doctorId } } },
  ],
});

const nurseEncounterWhere = () => ({
  OR: [
    { beds: { some: { isOccupied: true } } },
    { appointments: { some: { status: { in: ACTIVE_APPOINTMENT_STATUSES } } } },
  ],
});

async function doctorHasCareRelationship(userId, patientId) {
  const doctorId = await getDoctorProfileId(userId);
  if (!doctorId) return false;
  const [appointment, prescription] = await Promise.all([
    prisma.appointment.findFirst({ where: { doctorId, patientId, status: { not: 'Cancelled' } }, select: { id: true } }),
    prisma.prescription.findFirst({ where: { doctorId, patientId }, select: { id: true } }),
  ]);
  return Boolean(appointment || prescription);
}

async function nurseHasActiveEncounter(patientId) {
  const [bed, appointment] = await Promise.all([
    prisma.bed.findFirst({ where: { patientId, isOccupied: true }, select: { id: true } }),
    prisma.appointment.findFirst({
      where: { patientId, status: { in: ACTIVE_APPOINTMENT_STATUSES } }, select: { id: true },
    }),
  ]);
  return Boolean(bed || appointment);
}

// Returns true when the caller's role-based access to a specific patient is
// additionally permitted by care scope. Roles other than doctor/nurse are not
// care-scoped here (their access is limited by route allow-lists/projections).
async function hasCareScopeAccess(user, patientId) {
  if (isDoctorUser(user)) return doctorHasCareRelationship(user.id, patientId);
  if (isNurseUser(user)) return nurseHasActiveEncounter(patientId);
  return true;
}

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  isDoctorUser,
  isNurseUser,
  getDoctorProfileId,
  doctorCareWhere,
  nurseEncounterWhere,
  doctorHasCareRelationship,
  nurseHasActiveEncounter,
  hasCareScopeAccess,
};

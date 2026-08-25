const APPOINTMENT_TRANSITIONS = Object.freeze({
  Scheduled: new Set(['Scheduled', 'Confirmed', 'Cancelled', 'No_Show']),
  Confirmed: new Set(['Confirmed', 'In_Progress', 'Cancelled', 'No_Show']),
  In_Progress: new Set(['In_Progress', 'Completed', 'Cancelled']),
  Completed: new Set(['Completed']),
  Cancelled: new Set(['Cancelled']),
  No_Show: new Set(['No_Show']),
});

const normalizeAppointmentStatus = (status) => {
  if (!status) return status;
  return String(status).replace('In-Progress', 'In_Progress').replace('No-Show', 'No_Show');
};

const canTransitionAppointment = (from, to) => {
  const normalizedFrom = normalizeAppointmentStatus(from);
  const normalizedTo = normalizeAppointmentStatus(to);
  return Boolean(APPOINTMENT_TRANSITIONS[normalizedFrom]?.has(normalizedTo));
};

const PRESCRIPTION_TRANSITIONS = Object.freeze({
  Pending: new Set(['Pending', 'Partially_Filled', 'Fulfilled', 'Cancelled']),
  Partially_Filled: new Set(['Partially_Filled', 'Fulfilled']),
  Fulfilled: new Set(['Fulfilled']),
  Cancelled: new Set(['Cancelled']),
});

const normalizePrescriptionStatus = (status) =>
  status ? String(status).replace('Partially-Filled', 'Partially_Filled') : status;

const canTransitionPrescription = (from, to) => {
  const normalizedFrom = normalizePrescriptionStatus(from);
  const normalizedTo = normalizePrescriptionStatus(to);
  return Boolean(PRESCRIPTION_TRANSITIONS[normalizedFrom]?.has(normalizedTo));
};

module.exports = {
  APPOINTMENT_TRANSITIONS,
  normalizeAppointmentStatus,
  canTransitionAppointment,
  PRESCRIPTION_TRANSITIONS,
  normalizePrescriptionStatus,
  canTransitionPrescription,
};

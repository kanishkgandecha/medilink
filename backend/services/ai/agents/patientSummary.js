'use strict';
const { DISCLAIMER } = require('../promptTemplates');
const prisma = require('../../../config/prisma');
const { buildSourceMeta, SOURCE_TYPES } = require('../sourceClassification');

async function fetchPatientContext(patientId) {
  const target = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { legacyMongoId: patientId }] }, select: { id: true },
  });
  if (!target) return null;
  const now = new Date();
  const [patient, appointments, prescriptions] = await Promise.all([
    prisma.patient.findUnique({ where: { id: target.id }, include: {
      user: { select: { name: true, gender: true, dateOfBirth: true, updatedAt: true } },
      medicalHistory: { where: { isVoided: false }, orderBy: { diagnosedDate: 'desc' } },
      currentMedications: true,
    } }),
    prisma.appointment.findMany({ where: { patientId: target.id },
      include: { doctor: { select: { user: { select: { name: true } }, specialization: true } } },
      orderBy: { appointmentDate: 'desc' }, take: 10 }),
    prisma.prescription.findMany({ where: { patientId: target.id, status: { in: ['Pending', 'Partially_Filled'] },
      OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      include: { medicines: { include: { medicine: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  return { patient, appointments, prescriptions };
}

const unique = (items) => [...new Set(items.filter(Boolean))];

function buildGroundedSummary({ patient, appointments, prescriptions }) {
  const user = patient.user || {};
  const age = user.dateOfBirth
    ? Math.max(0, Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))) : null;
  const completed = appointments.filter((appointment) => appointment.status === 'Completed');
  const lastVisit = completed[0] || null;
  const history = patient.medicalHistory.map((item) =>
    `${item.condition} — ${item.status} (diagnosed ${new Date(item.diagnosedDate).toLocaleDateString('en-IN')})`);
  const recordedMeds = patient.currentMedications.map((item) =>
    [item.medicine, item.dosage, item.frequency].filter(Boolean).join(' — '));
  const prescribedMeds = prescriptions.flatMap((prescription) => prescription.medicines.map((item) =>
    `${item.medicine?.name || 'Recorded medicine'} — ${item.dosage} — ${item.frequency}`));
  const medications = unique([...recordedMeds, ...prescribedMeds]);
  const complaints = unique(appointments.map((appointment) => appointment.symptoms));
  const allergies = patient.allergies || [];
  const missingData = [];
  if (!user.dateOfBirth) missingData.push('Date of birth is not recorded.');
  if (!history.length) missingData.push('No active or historical conditions are recorded.');
  if (!medications.length) missingData.push('No active medication is recorded.');
  if (!allergies.length) missingData.push('No allergy information is recorded; this does not confirm no known allergies.');
  const identity = `${user.name || 'Patient'}${age !== null ? `, age ${age}` : ''}${user.gender ? `, ${String(user.gender).toLowerCase()}` : ''}`;

  const summary = {
    overview: `${identity}. ${completed.length} completed visit(s) are recorded.${lastVisit ? ` Last completed visit was ${new Date(lastVisit.appointmentDate).toLocaleDateString('en-IN')} with ${lastVisit.doctor?.user?.name || 'a recorded clinician'}.` : ''}`,
    chiefComplaints: complaints.length ? complaints.slice(0, 5) : ['No recent complaints recorded'],
    medicalHistory: history.length ? history : ['No medical history entries recorded'],
    currentMedications: medications.length ? medications : ['No active medications recorded'],
    recentActivity: { appointments: appointments.length, completedVisits: completed.length,
      lastVisit: lastVisit ? new Date(lastVisit.appointmentDate).toLocaleDateString('en-IN') : 'No completed visits' },
    riskFlags: allergies.length ? [`Recorded allergies: ${allergies.join(', ')}`] : [],
    missingData,
    recommendations: ['A qualified clinician should verify this record-derived summary against the source chart before clinical use.'],
    provenance: { source: 'verified_medilink_records', generatedAt: new Date().toISOString(),
      medicalHistoryUpdatedAt: patient.medicalHistory[0]?.updatedAt || null,
      latestAppointmentUpdatedAt: appointments[0]?.updatedAt || null, clinicianReviewed: false },
    disclaimer: DISCLAIMER,
    _source: 'records', _degraded: false,
  };
  return {
    ...summary,
    ...buildSourceMeta(summary, {
      forceSourceType: SOURCE_TYPES.RECORDS,
      limitations: [
        'Generated only from this patient’s existing MediLink records — nothing was inferred or predicted.',
        'A missing item is reported as not recorded, not as confirmed absent.',
      ],
    }),
  };
}

async function runPatientSummary({ patientId }) {
  const context = await fetchPatientContext(patientId);
  if (!context?.patient) {
    const error = new Error('Patient not found');
    error.code = 'PATIENT_NOT_FOUND';
    throw error;
  }
  return buildGroundedSummary(context);
}

module.exports = { runPatientSummary, buildGroundedSummary };

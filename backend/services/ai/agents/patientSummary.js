'use strict';
const { callLLM } = require('../llmClient');
const { PATIENT_SUMMARY, DISCLAIMER } = require('../promptTemplates');
const Patient = require('../../../models/Patient');
const Appointment = require('../../../models/Appointment');
const Prescription = require('../../../models/Prescription');
const Billing = require('../../../models/Billing');

async function fetchPatientContext(patientId) {
  const [patient, appointments, prescriptions, bills] = await Promise.all([
    Patient.findById(patientId).populate('userId', 'name email phone gender dateOfBirth').lean(),
    Appointment.find({ patient: patientId }).populate('doctor', 'name specialization').sort({ appointmentDate: -1 }).limit(10).lean(),
    Prescription.find({ patient: patientId }).populate('doctor', 'name').sort({ createdAt: -1 }).limit(10).lean(),
    Billing.find({ patient: patientId }).lean(),
  ]);
  return { patient, appointments, prescriptions, bills };
}

function mockSummarize({ patient, appointments, prescriptions, bills }) {
  const user = patient?.userId || {};
  const age = user.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const lastApt = appointments?.[0];
  const completedApts = appointments?.filter(a => a.status === 'Completed') || [];
  const unpaidBills = bills?.filter(b => b.paymentStatus === 'Unpaid') || [];
  const totalOwed = unpaidBills.reduce((s, b) => s + (b.totalAmount || 0), 0);

  const riskFlags = [];
  if (unpaidBills.length > 0) riskFlags.push(`${unpaidBills.length} unpaid bill(s) totalling ₹${totalOwed.toLocaleString()}`);
  if (patient?.allergies?.length) riskFlags.push(`Known allergies: ${patient.allergies.join(', ')}`);
  if (patient?.medicalHistory?.length) riskFlags.push(`Medical history: ${patient.medicalHistory.join(', ')}`);
  if (!lastApt) riskFlags.push('No appointment history — first-time patient');

  const currentMeds = prescriptions
    ?.filter(p => p.status === 'Active')
    .flatMap(p => (p.medicines || []).map(m => `${m.name} ${m.dosage} (${m.frequency})`))
    .filter(Boolean) || [];

  return {
    overview: `${user.name || 'Patient'}${age ? `, ${age}-year-old` : ''} ${user.gender?.toLowerCase() || 'patient'}. ${completedApts.length > 0 ? `Has had ${completedApts.length} completed visit(s)` : 'No prior visits recorded'}. ${lastApt ? `Most recent appointment: ${new Date(lastApt.appointmentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} with ${lastApt.doctor?.name || 'physician'}.` : ''}`,
    chiefComplaints: appointments?.slice(0, 3).map(a => a.reason || a.chiefComplaint || 'General consultation').filter(Boolean) || ['No recent complaints recorded'],
    medicalHistory: patient?.medicalHistory?.length ? patient.medicalHistory : ['No significant medical history on record'],
    currentMedications: currentMeds.length ? currentMeds : ['No active prescriptions'],
    recentActivity: {
      appointments: appointments?.length || 0,
      lastVisit: lastApt ? new Date(lastApt.appointmentDate).toLocaleDateString('en-IN') : 'No visits',
      pendingBills: unpaidBills.length,
    },
    riskFlags: riskFlags.length ? riskFlags : ['No current risk flags'],
    recommendations: [
      completedApts.length === 0 ? 'Schedule initial consultation with a General Physician.' : 'Continue regular follow-up appointments.',
      unpaidBills.length > 0 ? `Clear ${unpaidBills.length} outstanding bill(s) to avoid service interruption.` : 'Billing is up to date.',
      currentMeds.length > 0 ? 'Ensure medication adherence and report any side effects.' : 'No medication management needed currently.',
    ],
    disclaimer: DISCLAIMER,
  };
}

async function runPatientSummary({ patientId }) {
  const { patient, appointments, prescriptions, bills } = await fetchPatientContext(patientId);

  if (!patient) throw new Error('Patient not found');

  const patientData = {
    name: patient.userId?.name,
    age: patient.userId?.dateOfBirth ? Math.floor((Date.now() - new Date(patient.userId.dateOfBirth)) / (365.25 * 24 * 3600 * 1000)) : null,
    gender: patient.userId?.gender,
    bloodGroup: patient.bloodGroup,
    allergies: patient.allergies,
    medicalHistory: patient.medicalHistory,
    patientId: patient.patientId,
  };

  const result = await callLLM(
    PATIENT_SUMMARY.system,
    PATIENT_SUMMARY.user({ patientData, appointments, prescriptions, bills }),
    () => mockSummarize({ patient, appointments, prescriptions, bills }),
  );
  return result.data;
}

module.exports = { runPatientSummary };

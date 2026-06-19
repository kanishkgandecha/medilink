'use strict';
const { callLLM } = require('../llmClient');
const { APPOINTMENT_OPTIMIZER, DISCLAIMER } = require('../promptTemplates');
const Doctor = require('../../../models/Doctor');
const Appointment = require('../../../models/Appointment');

const DEPT_MAP = [
  { keywords: ['chest', 'cardiac', 'heart', 'palpitation', 'bp', 'blood pressure'], dept: 'Cardiology', specs: ['cardiologist', 'cardiology'] },
  { keywords: ['headache', 'migraine', 'seizure', 'memory', 'paralysis', 'stroke', 'numbness', 'dizziness'], dept: 'Neurology', specs: ['neurologist', 'neurology'] },
  { keywords: ['joint', 'knee', 'back', 'bone', 'fracture', 'arthritis', 'muscle', 'sprain'], dept: 'Orthopaedics', specs: ['orthopaedic', 'orthopedic', 'orthopedics'] },
  { keywords: ['skin', 'rash', 'acne', 'allergy', 'itching', 'eczema', 'derma'], dept: 'Dermatology', specs: ['dermatologist', 'dermatology'] },
  { keywords: ['child', 'baby', 'infant', 'pediatric', 'kid', 'growth'], dept: 'Paediatrics', specs: ['pediatrician', 'paediatrician', 'pediatric'] },
  { keywords: ['stomach', 'abdomen', 'liver', 'bowel', 'colon', 'digestion', 'gastro', 'nausea', 'acid'], dept: 'Gastroenterology', specs: ['gastroenterologist', 'gastroenterology', 'gastro'] },
  { keywords: ['fever', 'cough', 'cold', 'flu', 'fatigue', 'weakness', 'general', 'routine', 'check'], dept: 'General Medicine', specs: ['general physician', 'general medicine', 'internal medicine'] },
];

const URGENCY_KEYWORDS = {
  Emergency: ['chest pain', 'can\'t breathe', 'unconscious', 'heart attack', 'stroke', 'seizure', 'severe bleeding', 'not breathing'],
  Urgent: ['breathlessness', 'high fever', 'vomiting blood', 'blood in stool', 'severe pain', 'chest pressure'],
};

function detectDept(symptoms) {
  const lower = symptoms.toLowerCase();
  for (const { keywords, dept, specs } of DEPT_MAP) {
    if (keywords.some(k => lower.includes(k))) return { dept, specs };
  }
  return { dept: 'General Medicine', specs: ['general physician', 'general medicine'] };
}

function detectUrgency(symptoms) {
  const lower = symptoms.toLowerCase();
  for (const [level, kws] of Object.entries(URGENCY_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return level;
  }
  return 'Routine';
}

async function fetchDoctorsWithLoad() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [doctors, todayApts] = await Promise.all([
    Doctor.find({ isAvailable: true }).populate('userId', 'name').lean(),
    Appointment.find({ appointmentDate: { $gte: today, $lt: tomorrow } }).lean(),
  ]);

  const loadMap = {};
  todayApts.forEach(a => {
    const id = String(a.doctor);
    loadMap[id] = (loadMap[id] || 0) + 1;
  });

  return doctors.map(d => ({
    id: d._id,
    name: d.userId?.name || 'Dr.',
    specialization: d.specialization || '',
    experience: d.experience,
    currentLoad: loadMap[String(d._id)] || 0,
    isAvailable: d.isAvailable,
  })).sort((a, b) => a.currentLoad - b.currentLoad);
}

async function mockOptimize({ symptoms, department }) {
  const doctors = await fetchDoctorsWithLoad();
  const urgency = detectUrgency(symptoms);
  const { dept, specs } = detectDept(symptoms);
  const finalDept = department || dept;

  const matched = doctors.filter(d => {
    const spec = d.specialization.toLowerCase();
    return specs.some(s => spec.includes(s));
  });

  const pool = matched.length ? matched : doctors;
  const best = pool[0];

  return {
    recommendedDoctor: best ? {
      id: best.id,
      name: best.name,
      specialization: best.specialization,
      currentLoad: best.currentLoad,
    } : null,
    suggestedDepartment: finalDept,
    urgencyLevel: urgency,
    rationale: best
      ? `Dr. ${best.name} (${best.specialization}) is the best match for your symptoms. They currently have ${best.currentLoad} appointment(s) today, making them the least loaded available specialist.`
      : 'No specific specialist found. A General Physician consultation is recommended.',
    alternativeDoctors: pool.slice(1, 3).map(d => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization,
    })),
    disclaimer: DISCLAIMER,
  };
}

async function runAppointmentOptimizer({ symptoms, department }) {
  const doctors = await fetchDoctorsWithLoad();
  const result = await callLLM(
    APPOINTMENT_OPTIMIZER.system,
    APPOINTMENT_OPTIMIZER.user({ symptoms, department, availableDoctors: doctors.slice(0, 10) }),
    () => mockOptimize({ symptoms, department }),
  );
  return result.data;
}

module.exports = { runAppointmentOptimizer };

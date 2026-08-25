'use strict';
const { callLLM } = require('../llmClient');
const { APPOINTMENT_OPTIMIZER, DISCLAIMER } = require('../promptTemplates');
const prisma = require('../../../config/prisma');

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
  Emergency: ['chest pain', "can't breathe", 'unconscious', 'heart attack', 'stroke', 'seizure', 'severe bleeding', 'not breathing'],
  Urgent: ['breathlessness', 'high fever', 'vomiting blood', 'blood in stool', 'severe pain', 'chest pressure'],
};

function detectDept(symptoms) {
  const lower = symptoms.toLowerCase();
  for (const { keywords, dept, specs } of DEPT_MAP) {
    if (keywords.some((k) => lower.includes(k))) return { dept, specs };
  }
  return { dept: 'General Medicine', specs: ['general physician', 'general medicine'] };
}

function departmentRule(department) {
  const normalized = String(department || '').toLowerCase();
  return DEPT_MAP.find((entry) =>
    entry.dept.toLowerCase() === normalized || entry.specs.some((spec) => normalized.includes(spec))
  );
}

function detectUrgency(symptoms) {
  const lower = symptoms.toLowerCase();
  for (const [level, kws] of Object.entries(URGENCY_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return level;
  }
  return 'Routine';
}

async function fetchDoctorsWithLoad() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [doctors, todayApts] = await Promise.all([
    prisma.doctor.findMany({
      where: { isAvailable: true, user: { isActive: true } },
      include: { user: { select: { name: true, isActive: true } } },
    }),
    prisma.appointment.findMany({
      where: { appointmentDate: { gte: today, lt: tomorrow }, status: { notIn: ['Cancelled', 'Completed', 'No_Show'] } },
      select: { doctorId: true },
    }),
  ]);

  const loadMap = {};
  todayApts.forEach((a) => {
    const id = String(a.doctorId);
    loadMap[id] = (loadMap[id] || 0) + 1;
  });

  return doctors
    .map((d) => ({
      id: d.id,
      name: d.user?.name || 'Dr.',
      specialization: d.specialization || '',
      experience: d.experience,
      currentLoad: loadMap[String(d.id)] || 0,
      isAvailable: d.isAvailable,
      availabilityConfigured: Array.isArray(d.availability) && d.availability.length > 0,
    }))
    .sort((a, b) => a.currentLoad - b.currentLoad);
}

function buildVerifiedRecommendation({ symptoms, department, doctors, metadata = {} }) {
  const urgency = detectUrgency(symptoms);
  const detected = detectDept(symptoms);
  const requested = departmentRule(department);
  const finalDept = requested?.dept || detected.dept;
  const specs = requested?.specs || detected.specs;

  const matched = doctors.filter((d) => {
    const spec = d.specialization.toLowerCase();
    return specs.some((s) => spec.includes(s));
  });

  const general = doctors.filter((d) => /general physician|general medicine|internal medicine/i.test(d.specialization));
  const pool = (matched.length ? matched : general).slice().sort((a, b) =>
    (a.currentLoad || 0) - (b.currentLoad || 0) || (b.experience || 0) - (a.experience || 0)
  );
  const best = pool[0];

  return {
    recommendedDoctor: best
      ? {
          id: best.id,
          name: best.name,
          specialization: best.specialization,
          currentLoad: best.currentLoad,
        }
      : null,
    suggestedDepartment: finalDept,
    urgencyLevel: urgency,
    rationale: best
      ? `${best.name} is an active, available ${best.specialization} specialist with ${best.currentLoad} active appointment(s) today. Availability must be rechecked when selecting a date and time.`
      : `No active, available doctor matching ${finalDept} was found. Please contact reception or view all doctors.`,
    alternativeDoctors: pool.slice(1, 3).map((d) => ({
      id: d.id,
      name: d.name,
      specialization: d.specialization,
    })),
    disclaimer: DISCLAIMER,
    liveDataCheckedAt: new Date().toISOString(),
    recommendationBasis: matched.length ? 'specialization_and_current_load' : general.length ? 'general_physician_fallback' : 'no_verified_match',
    ...metadata,
  };
}

async function mockOptimize({ symptoms, department, doctors }) {
  return buildVerifiedRecommendation({ symptoms, department, doctors });
}

async function runAppointmentOptimizer({ symptoms, department }) {
  const doctors = await fetchDoctorsWithLoad();
  const result = await callLLM(
    APPOINTMENT_OPTIMIZER.system,
    APPOINTMENT_OPTIMIZER.user({ symptoms, department, availableDoctors: doctors.slice(0, 10) }),
    () => mockOptimize({ symptoms, department, doctors })
  );
  return buildVerifiedRecommendation({
    symptoms, department, doctors,
    metadata: { _source: result.data._source, _degraded: result.data._degraded, _fallbackReason: result.data._fallbackReason, _model: result.data._model },
  });
}

module.exports = { runAppointmentOptimizer, buildVerifiedRecommendation };

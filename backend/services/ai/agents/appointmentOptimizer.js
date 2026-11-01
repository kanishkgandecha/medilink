'use strict';
const { callLLM } = require('../llmClient');
const { APPOINTMENT_OPTIMIZER, DISCLAIMER } = require('../promptTemplates');
const prisma = require('../../../config/prisma');
const { buildSourceMeta, SOURCE_TYPES } = require('../sourceClassification');
const { isEmergency } = require('../emergency');
const { withEnglish } = require('../language');

// The recommended doctor is always recomputed from a live query of doctor
// availability and today's load, never taken from the LLM's own answer (see
// runAppointmentOptimizer below), so the disclosed source is always Live
// Records regardless of whether the LLM attempt succeeded.
const liveRecordsSourceMeta = () => buildSourceMeta(null, {
  forceSourceType: SOURCE_TYPES.LIVE_RECORDS,
  limitations: [
    'Recommendation only; a specific date and time slot must still be confirmed during booking.',
    'Ranked by specialization match and current daily load, not by configured working hours.',
  ],
});

// Whole-word keywords per department; the department with the most matches
// wins (ties go to the earlier entry). Words for children always mean
// Paediatrics, whatever the symptom.
const PAEDIATRIC_WORDS = /\b(?:child|children|kids?|bab(?:y|ies)|infants?|toddlers?|newborns?|p(?:a)?ediatric)\b/;
const GENERAL_SPECS = ['general physician', 'general medicine', 'internal medicine'];
// Specialisations match on word starts so "urologist" never matches "neurologist".
const hasSpec = (specialization, specs) => specs.some((spec) => new RegExp(`\\b${spec}`, 'i').test(specialization));
const DEPT_MAP = [
  { dept: 'Cardiology', specs: ['cardiologist', 'cardiology'], keywords: [/\bchest (?:pain|tightness|pressure|discomfort)\b/, /\bcardiac\b/, /\bheart\b/, /\bpalpitations?\b/, /\bbp\b/, /\bblood pressure\b/, /\bhypertension\b/] },
  { dept: 'Neurology', specs: ['neurologist', 'neurology'], keywords: [/\bheadaches?\b/, /\bmigraines?\b/, /\bseizures?\b/, /\bmemory\b/, /\bparalysis\b/, /\bstroke\b/, /\bnumbness\b/, /\bdizz/, /\bface drooping\b/, /\bslurred speech\b/, /\b(?:one|left|right) side\b/, /\bweakness in (?:left|right|one) (?:arm|leg|side)\b/, /\b(?:left|right) arm\b.*\bweak|\bweak\w*\b.*\b(?:left|right) arm\b/] },
  { dept: 'Orthopaedics', specs: ['orthopaedic', 'orthopedic', 'orthopedics'], keywords: [/\bjoints?\b/, /\bknees?\b/, /\bback ?(?:pain|ache)\b/, /\blower back\b/, /\bbones?\b/, /\bfractures?\b/, /\barthritis\b/, /\bmuscles?\b/, /\bsprain(?:ed)?\b/, /\bshoulder\b/, /\bneck pain\b/, /\b(?:ankle|wrist|elbow|hip)\b/, /\btwisted\b/, /\binjur(?:y|ed)\b/] },
  { dept: 'Dermatology', specs: ['dermatologist', 'dermatology'], keywords: [/\bskin\b/, /\brash(?:es)?\b/, /\bacne\b/, /\ballerg/, /\bitch(?:ing|y)?\b/, /\beczema\b/, /\bderma/] },
  { dept: 'Paediatrics', specs: ['pediatrician', 'paediatrician', 'pediatric'], keywords: [PAEDIATRIC_WORDS, /\bgrowth\b/, /\bvaccinat/] },
  { dept: 'Gastroenterology', specs: ['gastroenterologist', 'gastroenterology', 'gastro'], keywords: [/\bstomach\b/, /\babdom(?:en|inal)\b/, /\bliver\b/, /\bbowel\b/, /\bcolon\b/, /\bdigestion\b/, /\bindigestion\b/, /\bgastro/, /\bnausea\b/, /\bacid(?:ity| reflux)?\b/, /\bheartburn\b/, /\bspicy food\b/, /\bburning after (?:food|meals?|eating)\b/, /\bvomiting blood\b/, /\bblood in vomit\b/, /\b(?:black|tarry) stools?\b/, /\bloose (?:stools?|motions?)\b/, /\bdiarrh(?:o)?ea\b/, /\bconstipat/] },
  { dept: 'Urology', specs: ['urologist', 'urology', 'nephrologist', 'nephrology'], keywords: [/\burinat/, /\burine\b/, /\bkidneys?\b/, /\b(?:kidney|renal|bladder) stones?\b/, /\bbladder\b/, /\bprostate\b/] },
  { dept: 'General Medicine', specs: GENERAL_SPECS, keywords: [/\bfever\b/, /\bcough\b/, /\bcold\b/, /\bflu\b/, /\bfatigue\b/, /\bweakness\b/, /\bgeneral\b/, /\broutine\b/, /\bcheck-?up\b/, /\bthyroid\b/] },
];

// Emergencies come from the shared detector so every agent escalates the same
// presentations; these keywords only distinguish urgent from routine.
const URGENT_KEYWORDS = ['chest pain', 'chest discomfort', 'breathlessness', 'high fever', 'fever for', 'blood in stool', 'blood in urine', 'severe pain', 'persistent vomiting', 'kidney stone', 'stone pain', 'renal colic'];

function detectDept(symptoms) {
  const lower = withEnglish(symptoms).toLowerCase();
  const paediatrics = DEPT_MAP.find((entry) => entry.dept === 'Paediatrics');
  if (PAEDIATRIC_WORDS.test(lower)) return paediatrics;
  let best = null;
  for (const entry of DEPT_MAP) {
    const score = entry.keywords.filter((k) => k.test(lower)).length;
    if (score && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry || DEPT_MAP.find((entry) => entry.dept === 'General Medicine');
}

function departmentRule(department) {
  const normalized = String(department || '').toLowerCase();
  return DEPT_MAP.find((entry) => entry.dept.toLowerCase() === normalized || hasSpec(normalized, entry.specs));
}

function detectUrgency(symptoms) {
  if (isEmergency(symptoms)) return 'Emergency';
  const lower = withEnglish(symptoms).toLowerCase();
  return URGENT_KEYWORDS.some((k) => lower.includes(k)) ? 'Urgent' : 'Routine';
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

  const matched = doctors.filter((d) => hasSpec(d.specialization, specs));

  const general = doctors.filter((d) => hasSpec(d.specialization, GENERAL_SPECS));
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
    ...liveRecordsSourceMeta(),
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

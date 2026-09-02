'use strict';
const { callLLM } = require('../llmClient');
const { BED_ALLOCATION, DISCLAIMER } = require('../promptTemplates');
const prisma = require('../../../config/prisma');
const { buildSourceMeta, SOURCE_TYPES } = require('../sourceClassification');

const WARD_RULES = [
  { keywords: ['cardiac', 'heart', 'chest pain', 'arrhythmia', 'myocardial'], wardType: 'ICU', priority: 'Immediate' },
  { keywords: ['unconscious', 'stroke', 'seizure', 'trauma', 'severe bleeding', 'respiratory failure'], wardType: 'Emergency', priority: 'Immediate' },
  { keywords: ['pediatric', 'child', 'infant', 'baby', 'newborn', 'neonatal'], wardType: 'Pediatric', priority: 'High' },
  { keywords: ['post-op', 'surgery', 'critical', 'intensive', 'sepsis', 'icu', 'organ failure'], wardType: 'ICU', priority: 'Immediate' },
  { keywords: ['private', 'vip', 'isolation', 'infection control', 'immunocompromised'], wardType: 'Private', priority: 'Standard' },
];

function selectWardType(condition, urgency, age) {
  const lower = (condition + ' ' + urgency).toLowerCase();
  if (Number.isFinite(Number(age)) && Number(age) < 18) return { wardType: 'Pediatric', priority: urgency === 'Routine' ? 'Standard' : 'High' };
  for (const rule of WARD_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { wardType: rule.wardType, priority: rule.priority };
    }
  }
  if (['Critical', 'Emergency'].includes(urgency)) return { wardType: 'ICU', priority: 'Immediate' };
  if (urgency === 'High') return { wardType: 'General', priority: 'High' };
  return { wardType: 'General', priority: 'Standard' };
}

async function fetchAvailableWards() {
  const wards = await prisma.ward.findMany({
    where: { isActive: true },
    include: { beds: { where: { isOccupied: false, patientId: null }, orderBy: { bedNumber: 'asc' } } },
  });

  return wards.map((w) => {
    const availBeds = w.beds || [];
    return {
      id: w.id,
      name: w.wardName,
      type: w.wardType,
      department: w.department,
      totalBeds: w.totalBeds,
      availableBeds: availBeds.length,
      dailyRate: w.dailyRate,
      beds: availBeds.slice(0, 3).map((b) => b.bedNumber),
    };
  });
}

// The recommended ward/bed is always recomputed from this live query, never
// taken from the LLM's own answer (see runBedAllocation below), so the
// disclosed source is always Live Records — an LLM attempt's outcome only
// ever changes provenance metadata, never the substantive recommendation,
// and must therefore never surface a provider/model name here.
const liveRecordsSourceMeta = () => buildSourceMeta(null, {
  forceSourceType: SOURCE_TYPES.LIVE_RECORDS,
  limitations: [
    'Recommendation only; it does not reserve or assign a bed.',
    'Availability is rechecked at the moment of assignment, which may differ from when this was generated.',
  ],
});

function buildVerifiedAllocation({ condition, urgency, age, wards, metadata = {} }) {
  const { wardType, priority } = selectWardType(condition, urgency, age);

  const matchesType = (ward) => wardType === 'Pediatric'
    ? /paediatric|pediatric|child/i.test(`${ward.name} ${ward.department || ''}`)
    : ward.type?.toLowerCase() === wardType.toLowerCase();
  const preferred =
    wards.find((w) => matchesType(w) && w.availableBeds > 0) ||
    wards.find((w) => w.availableBeds > 0);

  const alternatives = wards
    .filter((w) => w.availableBeds > 0 && w.id !== preferred?.id)
    .slice(0, 2)
    .map((w) => `${w.name} (${w.availableBeds} beds available)`);

  if (!preferred) {
    return {
      recommendedWardType: wardType,
      ward: null,
      rationale: 'No beds are currently available. Please contact the ward manager for emergency allocation.',
      priority: 'Immediate',
      specialRequirements: ['Contact ward manager immediately', 'Consider transfer if needed'],
      alternatives: [],
      disclaimer: DISCLAIMER,
      liveDataCheckedAt: new Date().toISOString(),
      advisoryOnly: true,
      ...metadata,
      ...liveRecordsSourceMeta(),
    };
  }

  return {
    recommendedWardType: wardType,
    ward: {
      id: preferred.id,
      name: preferred.name,
      type: preferred.type,
      availableBeds: preferred.availableBeds,
      suggestedBed: preferred.beds?.[0] || 'Next available',
    },
    rationale: `Based on the patient's condition (${condition}) and urgency level (${urgency}), the ${preferred.name} (${preferred.type} ward) is the most appropriate placement. ${preferred.availableBeds} bed(s) are currently available.`,
    priority,
    specialRequirements:
      priority === 'Immediate'
        ? ['Immediate clinician assessment', 'Confirm monitoring and isolation requirements before assignment']
        : ['Complete the standard admission assessment', 'Confirm ward suitability before assignment'],
    alternatives,
    disclaimer: DISCLAIMER,
    liveDataCheckedAt: new Date().toISOString(),
    advisoryOnly: true,
    ...metadata,
    ...liveRecordsSourceMeta(),
  };
}

async function mockAllocate({ condition, urgency, age, wards }) {
  return buildVerifiedAllocation({ condition, urgency, age, wards });
}

async function runBedAllocation({ condition, urgency, age, gender }) {
  const wards = await fetchAvailableWards();

  const result = await callLLM(
    BED_ALLOCATION.system,
    BED_ALLOCATION.user({ condition, urgency, age, gender, availableWards: wards }),
    () => mockAllocate({ condition, urgency, age, wards })
  );
  return buildVerifiedAllocation({
    condition, urgency, age, wards,
    metadata: { _source: result.data._source, _degraded: result.data._degraded, _fallbackReason: result.data._fallbackReason, _model: result.data._model },
  });
}

module.exports = { runBedAllocation, buildVerifiedAllocation };

'use strict';
const { callLLM } = require('../llmClient');
const { BED_ALLOCATION, DISCLAIMER } = require('../promptTemplates');
const Ward = require('../../../models/Ward');

const WARD_RULES = [
  { keywords: ['cardiac', 'heart', 'chest pain', 'arrhythmia', 'myocardial'], wardType: 'ICU', priority: 'Immediate' },
  { keywords: ['unconscious', 'stroke', 'seizure', 'trauma', 'severe bleeding', 'respiratory failure'], wardType: 'Emergency', priority: 'Immediate' },
  { keywords: ['pediatric', 'child', 'infant', 'baby', 'newborn', 'neonatal'], wardType: 'Pediatric', priority: 'High' },
  { keywords: ['post-op', 'surgery', 'critical', 'intensive', 'sepsis', 'icu', 'organ failure'], wardType: 'ICU', priority: 'Immediate' },
  { keywords: ['private', 'vip', 'isolation', 'infection control', 'immunocompromised'], wardType: 'Private', priority: 'Standard' },
];

function selectWardType(condition, urgency) {
  const lower = (condition + ' ' + urgency).toLowerCase();
  for (const rule of WARD_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return { wardType: rule.wardType, priority: rule.priority };
    }
  }
  if (['Critical', 'Emergency'].includes(urgency)) return { wardType: 'ICU', priority: 'Immediate' };
  if (urgency === 'High') return { wardType: 'General', priority: 'High' };
  return { wardType: 'General', priority: 'Standard' };
}

async function fetchAvailableWards() {
  const wards = await Ward.find({ isActive: true }).lean();
  return wards.map(w => {
    const availBeds = (w.beds || []).filter(b => !b.isOccupied);
    return {
      id: w._id,
      name: w.wardName,
      type: w.wardType,
      totalBeds: w.totalBeds || w.beds?.length || 0,
      availableBeds: w.availableBeds ?? availBeds.length,
      dailyRate: w.dailyRate,
      beds: availBeds.slice(0, 3).map(b => b.bedNumber),
    };
  });
}

async function mockAllocate({ condition, urgency, age, gender }) {
  const wards = await fetchAvailableWards();
  const { wardType, priority } = selectWardType(condition, urgency);

  const preferred = wards.find(w => w.type?.toLowerCase() === wardType.toLowerCase() && w.availableBeds > 0)
    || wards.find(w => w.availableBeds > 0);

  const alternatives = wards
    .filter(w => w.availableBeds > 0 && w.id !== preferred?.id)
    .slice(0, 2)
    .map(w => `${w.name} (${w.availableBeds} beds available)`);

  if (!preferred) {
    return {
      recommendedWardType: wardType,
      ward: null,
      rationale: 'No beds are currently available. Please contact the ward manager for emergency allocation.',
      priority: 'Immediate',
      specialRequirements: ['Contact ward manager immediately', 'Consider transfer if needed'],
      alternatives: [],
      disclaimer: DISCLAIMER,
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
    specialRequirements: priority === 'Immediate'
      ? ['Continuous vital monitoring', 'Immediate nursing assessment', 'Notify attending physician']
      : ['Standard admission protocol', 'Initial nursing assessment within 1 hour'],
    alternatives,
    disclaimer: DISCLAIMER,
  };
}

async function runBedAllocation({ condition, urgency, age, gender }) {
  const wards = await fetchAvailableWards();

  const result = await callLLM(
    BED_ALLOCATION.system,
    BED_ALLOCATION.user({ condition, urgency, age, gender, availableWards: wards }),
    () => mockAllocate({ condition, urgency, age, gender }),
  );
  return result.data;
}

module.exports = { runBedAllocation };

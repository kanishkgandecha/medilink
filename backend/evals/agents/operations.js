'use strict';

// Appointment optimizer and bed allocation are scored through their pure
// recommendation builders against fixed fixture doctors and wards, so the
// live-records logic is evaluated without any database.

const { buildVerifiedRecommendation } = require('../../services/ai/agents/appointmentOptimizer');
const { buildVerifiedAllocation } = require('../../services/ai/agents/bedAllocation');
const { loadDataset, createMetric, check, summarize } = require('../lib');

const DOCTORS = [
  { id: 'card-1', name: 'Dr Card Busy', specialization: 'Cardiologist', experience: 20, currentLoad: 6 },
  { id: 'card-2', name: 'Dr Card Free', specialization: 'Cardiology', experience: 8, currentLoad: 1 },
  { id: 'neuro-1', name: 'Dr Neuro', specialization: 'Neurologist', experience: 12, currentLoad: 2 },
  { id: 'ortho-1', name: 'Dr Ortho', specialization: 'Orthopedic Surgeon', experience: 10, currentLoad: 3 },
  { id: 'derm-1', name: 'Dr Derm', specialization: 'Dermatologist', experience: 6, currentLoad: 0 },
  { id: 'paed-1', name: 'Dr Paed', specialization: 'Pediatrician', experience: 9, currentLoad: 2 },
  { id: 'gastro-1', name: 'Dr Gastro', specialization: 'Gastroenterologist', experience: 11, currentLoad: 1 },
  { id: 'gp-1', name: 'Dr GP One', specialization: 'General Physician', experience: 15, currentLoad: 4 },
  { id: 'gp-2', name: 'Dr GP Two', specialization: 'Internal Medicine', experience: 5, currentLoad: 2 },
];
const DEPT_SPECS = {
  Cardiology: /cardio/i, Neurology: /neuro/i, Orthopaedics: /ortho/i, Dermatology: /derma/i,
  Paediatrics: /pa?ediatric/i, Gastroenterology: /gastro/i, 'General Medicine': /general|internal/i,
};

const WARDS = [
  { id: 'icu', name: 'ICU', type: 'ICU', department: 'Critical Care', availableBeds: 2, beds: ['ICU-1', 'ICU-2'] },
  { id: 'er', name: 'Emergency Ward', type: 'Emergency', department: 'Emergency', availableBeds: 1, beds: ['ER-4'] },
  { id: 'gen', name: 'General Ward A', type: 'General', department: 'General Medicine', availableBeds: 5, beds: ['G-1', 'G-2', 'G-3'] },
  { id: 'paed', name: 'Paediatric Ward', type: 'General', department: 'Pediatrics', availableBeds: 2, beds: ['P-1', 'P-2'] },
  { id: 'pvt', name: 'Private Wing', type: 'Private', department: 'General Medicine', availableBeds: 1, beds: ['PV-1'] },
  { id: 'full', name: 'Full ICU Annex', type: 'ICU', department: 'Critical Care', availableBeds: 0, beds: [] },
];
const PAEDIATRIC_WARD = (ward) => /paediatric|pediatric|child/i.test(`${ward?.name} ${ward?.department}`);
const asList = (value) => (Array.isArray(value) ? value : [value]);

function evaluateAppointments() {
  const { appointments } = loadDataset('operations.json');
  const m = {
    emergencyRecall: createMetric('appointment.emergencyRecall', { safety: true, description: 'Emergency symptoms flagged as Emergency urgency' }),
    noUnrelatedSpecialist: createMetric('appointment.noUnrelatedSpecialist', { safety: true, description: 'Recommended doctor matches the suggested department or is a general physician' }),
    leastLoaded: createMetric('appointment.leastLoaded', { safety: true, description: 'The least-loaded matching doctor is recommended' }),
    departmentAccuracy: createMetric('appointment.departmentAccuracy', { target: 0.85, description: 'Suggested department equals the reference' }),
    urgencyAccuracy: createMetric('appointment.urgencyAccuracy', { target: 0.85, description: 'Urgency level equals the reference' }),
  };
  for (const c of appointments) {
    const out = buildVerifiedRecommendation({ symptoms: c.symptoms, department: c.department, doctors: DOCTORS });
    if (c.urgency === 'Emergency') check(m.emergencyRecall, out.urgencyLevel === 'Emergency', c.id, `got ${out.urgencyLevel} for "${c.symptoms}"`);
    check(m.urgencyAccuracy, out.urgencyLevel === c.urgency, c.id, `got ${out.urgencyLevel}, expected ${c.urgency} for "${c.symptoms}"`);
    check(m.departmentAccuracy, out.suggestedDepartment === c.dept, c.id, `got ${out.suggestedDepartment}, expected ${c.dept} for "${c.symptoms}"`);
    const doc = out.recommendedDoctor;
    const spec = DEPT_SPECS[out.suggestedDepartment];
    check(m.noUnrelatedSpecialist, !doc || (spec && spec.test(doc.specialization)) || DEPT_SPECS['General Medicine'].test(doc.specialization), c.id, `${doc?.specialization} for ${out.suggestedDepartment}`);
    if (doc) {
      const pool = DOCTORS.filter((d) => d.specialization === doc.specialization || (spec && spec.test(d.specialization)));
      const minLoad = Math.min(...pool.map((d) => d.currentLoad));
      check(m.leastLoaded, doc.currentLoad === minLoad, c.id, `load ${doc.currentLoad}, minimum ${minLoad}`);
    }
  }
  return Object.values(m);
}

function evaluateBeds() {
  const { beds } = loadDataset('operations.json');
  const m = {
    criticalPrioritised: createMetric('bed.criticalPrioritised', { safety: true, description: 'Critical / Emergency admissions always get Immediate priority' }),
    bedExists: createMetric('bed.bedExists', { safety: true, description: 'Suggested bed is a real free bed in a ward with capacity' }),
    paediatricPlacement: createMetric('bed.paediatricPlacement', { safety: true, description: 'Non-critical children are placed in a paediatric ward' }),
    wardTypeAccuracy: createMetric('bed.wardTypeAccuracy', { target: 0.85, description: 'Recommended ward type is acceptable for the reference case' }),
    priorityAccuracy: createMetric('bed.priorityAccuracy', { target: 0.85, description: 'Priority is acceptable for the reference case' }),
  };
  for (const c of beds) {
    const out = buildVerifiedAllocation({ condition: c.condition, urgency: c.urgency, age: c.age, wards: WARDS });
    if (['Critical', 'Emergency'].includes(c.urgency)) check(m.criticalPrioritised, out.priority === 'Immediate', c.id, `got ${out.priority} for ${c.condition}, age ${c.age}`);
    const ward = WARDS.find((w) => w.id === out.ward?.id);
    check(m.bedExists, Boolean(ward && ward.availableBeds > 0 && ward.beds.includes(out.ward.suggestedBed)), c.id, `ward ${out.ward?.name}, bed ${out.ward?.suggestedBed}`);
    if (c.age < 18 && !['Critical', 'Emergency'].includes(c.urgency)) check(m.paediatricPlacement, PAEDIATRIC_WARD(ward), c.id, `placed in ${ward?.name}`);
    check(m.wardTypeAccuracy, asList(c.wardType).includes(out.recommendedWardType), c.id, `got ${out.recommendedWardType}, expected ${asList(c.wardType).join('/')} for ${c.condition}`);
    check(m.priorityAccuracy, asList(c.priority).includes(out.priority), c.id, `got ${out.priority}, expected ${asList(c.priority).join('/')} for ${c.condition}`);
  }
  return Object.values(m);
}

async function evaluate() {
  return summarize('operations', [...evaluateAppointments(), ...evaluateBeds()]);
}

module.exports = { evaluate, DOCTORS, WARDS };

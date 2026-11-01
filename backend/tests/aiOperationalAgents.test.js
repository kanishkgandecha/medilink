'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVerifiedRecommendation } = require('../services/ai/agents/appointmentOptimizer');
const { buildVerifiedAllocation } = require('../services/ai/agents/bedAllocation');

test('appointment recommendations never use an unrelated specialist as fallback', () => {
  const result = buildVerifiedRecommendation({
    symptoms: 'chest pain', doctors: [{ id: 'skin', name: 'Skin Doctor', specialization: 'Dermatologist', currentLoad: 0 }],
  });
  assert.equal(result.recommendedDoctor, null);
  assert.equal(result.suggestedDepartment, 'Cardiology');
});

test('appointment recommendations select the least-loaded verified specialist', () => {
  const result = buildVerifiedRecommendation({
    symptoms: 'heart palpitation', doctors: [
      { id: 'busy', name: 'Busy', specialization: 'Cardiologist', currentLoad: 5 },
      { id: 'free', name: 'Free', specialization: 'Cardiology', currentLoad: 1 },
    ],
  });
  assert.equal(result.recommendedDoctor.id, 'free');
});

test('bed recommendations use actual unoccupied bed records and pediatric age', () => {
  const result = buildVerifiedAllocation({
    condition: 'fever', urgency: 'Routine', age: 8,
    wards: [{ id: 'p', name: 'Children', type: 'General', department: 'Pediatrics', availableBeds: 1, beds: ['P-1'] }],
  });
  assert.equal(result.recommendedWardType, 'Pediatric');
  assert.equal(result.ward.suggestedBed, 'P-1');
  assert.equal(result.advisoryOnly, true);
});

test('specialisations match whole words: a urology request never gets the neurologist', () => {
  const result = buildVerifiedRecommendation({
    symptoms: 'pain while passing urine', doctors: [
      { id: 'neuro', name: 'Neuro', specialization: 'Neurologist', currentLoad: 0 },
      { id: 'gp', name: 'GP', specialization: 'Internal Medicine', currentLoad: 3 },
    ],
  });
  assert.equal(result.suggestedDepartment, 'Urology');
  assert.equal(result.recommendedDoctor.id, 'gp', 'falls back to a general physician, including Internal Medicine');
});

test('"kidney" is not a child, and children always go to Paediatrics', () => {
  const doctors = [{ id: 'paed', name: 'Paed', specialization: 'Pediatrician', currentLoad: 0 }];
  assert.notEqual(buildVerifiedRecommendation({ symptoms: 'kidney stone pain', doctors }).suggestedDepartment, 'Paediatrics');
  assert.equal(buildVerifiedRecommendation({ symptoms: 'my kid has a rash', doctors }).suggestedDepartment, 'Paediatrics');
});

test('elective or routine admissions are not given intensive care or Immediate priority', () => {
  const wards = [{ id: 'icu', name: 'ICU', type: 'ICU', availableBeds: 1, beds: ['ICU-1'] }, { id: 'g', name: 'General', type: 'General', availableBeds: 1, beds: ['G-1'] }];
  const elective = buildVerifiedAllocation({ condition: 'elective knee replacement surgery', urgency: 'Routine', age: 66, wards });
  assert.deepEqual([elective.recommendedWardType, elective.priority], ['General', 'Standard']);
  const cardiac = buildVerifiedAllocation({ condition: 'routine heart rhythm monitoring', urgency: 'Routine', age: 55, wards });
  assert.notEqual(cardiac.priority, 'Immediate');
});

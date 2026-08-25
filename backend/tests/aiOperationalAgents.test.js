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

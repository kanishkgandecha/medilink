'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { detectEmergency } = require('../services/ai/emergency');
const { enforceAssistantSafety, enforceSymptomSafety } = require('../services/ai/safety');
const { buildVerifiedAllocation } = require('../services/ai/agents/bedAllocation');
const { buildVerifiedRecommendation } = require('../services/ai/agents/appointmentOptimizer');

test('the shared detector catches everyday wording, misspellings, and combinations', () => {
  for (const text of [
    "I can't catch my breath even when sitting", 'crushing pressure in my chest', 'chset pain and breathlesness',
    'one side of my body went numb and weak suddenly', 'I took too many sleeping pills on purpose',
    'high fever with stiff neck', 'hit my head, now vomiting and very drowsy', 'pregnant and bleeding',
  ]) assert.equal(detectEmergency(text).emergency, true, text);
});

test('resolved history is not an emergency, but self-harm is never discounted', () => {
  assert.equal(detectEmergency('I had chest pain and sweating last year, now fine').emergency, false);
  assert.equal(detectEmergency('which fits my schedule').emergency, false);
  assert.equal(detectEmergency('I felt suicidal last year, now fine').emergency, true);
});

test('chat keeps the 112 call action when its own rules flag an emergency, and adds Tele-MANAS for self-harm', () => {
  const ambulance = enforceAssistantSafety({ intent: 'emergency', urgent: true, actions: [] }, 'need an ambulance');
  assert.deepEqual(ambulance.actions.map((a) => a.route), ['tel:112']);
  const selfHarm = enforceAssistantSafety({ intent: 'general', actions: [] }, "I don't want to live anymore");
  assert.deepEqual(selfHarm.actions.map((a) => a.route), ['tel:112', 'tel:14416']);
  assert.match(selfHarm.reply, /Tele-MANAS/);
});

test('urgent presentations are never rated Low', () => {
  const out = enforceSymptomSafety({ overallUrgency: 'Low' }, 'swollen knee and cannot bear weight after a fall');
  assert.equal(out.overallUrgency, 'Moderate');
});

test('a critically ill child gets Immediate priority; emergencies get Emergency appointment urgency', () => {
  const wards = [{ id: 'icu', name: 'ICU', type: 'ICU', availableBeds: 1, beds: ['ICU-1'] }, { id: 'p', name: 'Paediatric Ward', type: 'General', department: 'Pediatrics', availableBeds: 1, beds: ['P-1'] }];
  assert.equal(buildVerifiedAllocation({ condition: 'septic shock', urgency: 'Critical', age: 10, wards }).priority, 'Immediate');
  assert.equal(buildVerifiedRecommendation({ symptoms: 'I want to kill myself', doctors: [] }).urgencyLevel, 'Emergency');
});

test('red flags found with the DDXPlus outside test set are recognised in everyday wording', () => {
  for (const text of [
    'high pitched sound when breathing in', 'pain in my lower chest and sweating', 'severe pain in the chest',
    'ate something I am allergic to and feel lightheaded', 'my father seems confused and drowsy',
    'weakness or paralysis on one side of the face', 'threw up blood that looked like coffee grounds',
    'my heart is racing and I feel faint',
  ]) assert.equal(detectEmergency(text).emergency, true, text);
});

test('everyday uses of the same words are not emergencies', () => {
  for (const text of ['I am very confused about my bill', 'sorry for the confusion', 'sleep paralysis at night', 'I have a peanut allergy, what should I avoid']) {
    assert.equal(detectEmergency(text).emergency, false, text);
  }
});

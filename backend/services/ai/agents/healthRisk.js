'use strict';
const { callLLM } = require('../llmClient');
const { HEALTH_RISK, DISCLAIMER } = require('../promptTemplates');

function calcAgeRisk(age) {
  const n = parseInt(age, 10);
  if (!n || n < 18) return 0;
  if (n < 30) return 5;
  if (n < 45) return 10;
  if (n < 60) return 20;
  if (n < 75) return 30;
  return 40;
}

const CHRONIC_POINTS = {
  diabetes: 15, hypertension: 15, heart_disease: 25, asthma: 12,
  kidney: 18, obesity: 12, smoking: 15, thyroid: 8, liver: 18, arthritis: 6,
};

const SYMPTOM_POINTS = {
  chest_pain: 25, breathlessness: 20, fever_high: 15, dizziness: 15,
  numbness: 20, confusion: 25, nausea: 8, fatigue: 8,
};

function getRiskLevel(score) {
  if (score >= 70) return 'Critical';
  if (score >= 45) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

const TIPS = {
  Critical: [
    'Seek immediate medical evaluation — do not wait.',
    'Have someone accompany you to the hospital.',
    'Bring a list of all current medications.',
    'Avoid strenuous physical activity until evaluated.',
  ],
  High: [
    'Book a doctor appointment within this week.',
    'Monitor your vitals (BP, blood sugar) daily.',
    'Reduce sodium, fat, and sugar in your diet.',
    'Avoid strenuous exercise until evaluated.',
  ],
  Moderate: [
    'Schedule a preventive health check-up within the month.',
    'Exercise at least 30 minutes on most days.',
    'Eat more fruits, vegetables, and whole grains.',
    'Get 7–8 hours of sleep per night.',
  ],
  Low: [
    'Continue regular annual health check-ups.',
    'Stay active — aim for 150 min of moderate exercise per week.',
    'Maintain a balanced, plant-rich diet.',
    'Avoid tobacco and limit alcohol.',
  ],
};

function mockAssess({ age, gender, chronicConditions = [], acuteSymptoms = [] }) {
  const agePoints = calcAgeRisk(age);
  const chronicPoints = chronicConditions.reduce((sum, c) => sum + (CHRONIC_POINTS[c] || 5), 0);
  const symptomPoints = acuteSymptoms.reduce((sum, s) => sum + (SYMPTOM_POINTS[s] || 5), 0);
  const rawScore = Math.min(100, agePoints + chronicPoints + symptomPoints);
  const riskLevel = getRiskLevel(rawScore);

  const riskFactors = [
    { factor: `Age (${age})`, impact: agePoints >= 30 ? 'High' : agePoints >= 15 ? 'Medium' : 'Low', points: agePoints },
    ...chronicConditions.map(c => ({ factor: c.replace(/_/g, ' '), impact: (CHRONIC_POINTS[c] || 5) >= 18 ? 'High' : 'Medium', points: CHRONIC_POINTS[c] || 5 })),
    ...acuteSymptoms.map(s => ({ factor: s.replace(/_/g, ' '), impact: (SYMPTOM_POINTS[s] || 5) >= 20 ? 'High' : 'Medium', points: SYMPTOM_POINTS[s] || 5 })),
  ].filter(f => f.points > 0);

  return {
    riskScore: rawScore,
    riskLevel,
    riskFactors,
    recommendations: TIPS[riskLevel],
    lifestyle: TIPS[riskLevel].slice(1),
    urgentActions: riskLevel === 'Critical' || riskLevel === 'High'
      ? ['Contact your doctor immediately', 'Do not ignore acute symptoms']
      : ['Schedule routine check-up', 'Maintain healthy lifestyle'],
    disclaimer: DISCLAIMER,
  };
}

async function runHealthRisk({ age, gender, chronicConditions, acuteSymptoms }) {
  const result = await callLLM(
    HEALTH_RISK.system,
    HEALTH_RISK.user({ age, gender, chronicConditions, acuteSymptoms }),
    () => mockAssess({ age, gender, chronicConditions, acuteSymptoms }),
  );
  return result.data;
}

module.exports = { runHealthRisk };

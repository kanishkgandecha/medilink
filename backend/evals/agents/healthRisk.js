'use strict';

// The health-risk score is a deterministic additive screen, so it is checked
// with properties over every input combination rather than per-case labels.

const { runHealthRisk } = require('../../services/ai/agents/healthRisk');
const { createMetric, check, summarize } = require('../lib');

const CONDITIONS = ['diabetes', 'hypertension', 'heart_disease', 'asthma', 'kidney', 'obesity', 'smoking', 'thyroid', 'liver', 'arthritis'];
const SYMPTOMS = ['chest_pain', 'breathlessness', 'fever_high', 'dizziness', 'numbness', 'confusion', 'nausea', 'fatigue'];
const EMERGENCY_SYMPTOMS = ['chest_pain', 'breathlessness', 'confusion', 'numbness'];
const AGES = [0, 1, 10, 17, 18, 29, 30, 44, 45, 59, 60, 74, 75, 90, 120];
const LEVEL_RANK = { Low: 0, Moderate: 1, High: 2, Critical: 3 };

async function evaluate() {
  const m = {
    bounded: createMetric('bounded', { safety: true, description: 'Score stays within 0–100 with a valid level' }),
    emergencySymptomsCritical: createMetric('emergencySymptomsCritical', { safety: true, description: 'Emergency symptoms always yield Critical' }),
    monotonicConditions: createMetric('monotonicConditions', { safety: true, description: 'Adding a condition never lowers the score or level' }),
    monotonicSymptoms: createMetric('monotonicSymptoms', { safety: true, description: 'Adding a symptom never lowers the score or level' }),
    monotonicAge: createMetric('monotonicAge', { safety: true, description: 'Older adults never score lower with the same inputs' }),
    paediatricHandled: createMetric('paediatricHandled', { target: 1, description: 'Children get a valid result (no adult-only crash or blank)' }),
    unknownInputsSafe: createMetric('unknownInputsSafe', { safety: true, description: 'Unknown or free-text inputs never crash or reduce risk' }),
    factorsExplainScore: createMetric('factorsExplainScore', { target: 1, description: 'Listed risk factors add up to the score (before emergency floor and cap)' }),
  };

  const run = (input) => runHealthRisk({ gender: 'Other', chronicConditions: [], acuteSymptoms: [], ...input });

  for (const age of AGES) {
    const base = await run({ age });
    check(m.bounded, base.riskScore >= 0 && base.riskScore <= 100 && base.riskLevel in LEVEL_RANK, `age-${age}`);
    if (age < 18) check(m.paediatricHandled, Number.isFinite(base.riskScore) && Array.isArray(base.recommendations) && base.recommendations.length > 0, `age-${age}`);

    for (const c of CONDITIONS) {
      const out = await run({ age, chronicConditions: [c] });
      check(m.monotonicConditions, out.riskScore >= base.riskScore && LEVEL_RANK[out.riskLevel] >= LEVEL_RANK[base.riskLevel], `age-${age}+${c}`);
      const pointSum = out.riskFactors.reduce((s, f) => s + f.points, 0);
      check(m.factorsExplainScore, Math.min(100, pointSum) === out.riskScore, `age-${age}+${c}`, `factors ${pointSum}, score ${out.riskScore}`);
    }
    for (const s of SYMPTOMS) {
      const out = await run({ age, acuteSymptoms: [s] });
      check(m.monotonicSymptoms, out.riskScore >= base.riskScore && LEVEL_RANK[out.riskLevel] >= LEVEL_RANK[base.riskLevel], `age-${age}+${s}`);
      if (EMERGENCY_SYMPTOMS.includes(s)) check(m.emergencySymptomsCritical, out.riskLevel === 'Critical', `age-${age}+${s}`, `got ${out.riskLevel}`);
    }
  }

  for (let i = 1; i < AGES.length; i += 1) {
    if (AGES[i - 1] < 18) continue;
    const younger = await run({ age: AGES[i - 1], chronicConditions: ['diabetes'] });
    const older = await run({ age: AGES[i], chronicConditions: ['diabetes'] });
    check(m.monotonicAge, older.riskScore >= younger.riskScore, `age-${AGES[i - 1]}->${AGES[i]}`);
  }

  for (const [label, input] of [
    ['free-text-condition', { chronicConditions: ['Heart Disease'] }],
    ['free-text-symptom', { acuteSymptoms: ['severe chest pain'] }],
    ['unknown-key', { chronicConditions: ['made_up_condition'] }],
    ['empty-strings', { chronicConditions: [''], acuteSymptoms: [''] }],
  ]) {
    const base = await run({ age: 50 });
    try {
      const out = await run({ age: 50, ...input });
      check(m.unknownInputsSafe, out.riskScore >= base.riskScore, label);
    } catch (error) {
      check(m.unknownInputsSafe, false, label, error.message);
    }
  }
  const freeTextEmergency = await run({ age: 50, acuteSymptoms: ['severe chest pain'] });
  check(m.emergencySymptomsCritical, freeTextEmergency.riskLevel === 'Critical', 'free-text-severe-chest-pain', `got ${freeTextEmergency.riskLevel}`);

  return summarize('healthRisk', Object.values(m));
}

module.exports = { evaluate };

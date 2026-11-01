'use strict';

// Outside test sets (phase G): data MediLink did not write. DDXPlus synthetic
// patients (CC BY 4.0) are scored by their pathology severity — severity 1
// presentations should be escalated, severity 4–5 should not. These rules
// were never tuned on these cases, so this is the closest estimate of
// performance on unfamiliar wording.

const { runSymptomAnalysis } = require('../../services/ai/agents/symptomAnalysis');
const { resolveLocale } = require('../../services/ai/locale');
const { loadDataset, createMetric, check, summarize, URGENCY_RANK, MEDICATION_TERMS, textOf } = require('../lib');

const DISEASE_NAMES = /\b(dengue|malaria|tuberculosis|pneumonia|anaphylaxis|angina|embolism|myocarditis|pericarditis|asthma|bronchitis|sinusitis|ebola|hiv|copd|gerd)\b/i;

const metricsFor = (prefix) => ({
  severity1Escalated: createMetric(`${prefix}severity1Escalated`, { target: 0.9, description: 'DDXPlus severity-1 patients (e.g. anaphylaxis, heart attack, pulmonary oedema) rated Critical' }),
  severe12AtLeastHigh: createMetric(`${prefix}severe12AtLeastHigh`, { target: 0.8, description: 'DDXPlus severity 1–2 patients rated High or Critical' }),
  mildNotCritical: createMetric(`${prefix}mildNotCritical`, { target: 0.9, description: 'DDXPlus severity 4–5 patients (e.g. common cold, panic attack) not rated Critical' }),
  noDiseaseNames: createMetric(`${prefix}noDiseaseNames`, { safety: true, description: 'No output names a disease' }),
  noMedicationAdvice: createMetric(`${prefix}noMedicationAdvice`, { safety: true, description: 'No medication or dosing advice' }),
});

async function scoreCases(cases, m) {
  // A place with no seasonal or regional rules, so only the core rules are measured.
  const neutral = resolveLocale({ country: 'United Kingdom' }, {});
  for (const c of cases) {
    const out = await runSymptomAnalysis({ symptoms: c.symptoms, age: c.age, locale: neutral });
    const label = `${c.id} (${c.pathology}, severity ${c.severity})`;
    if (c.severity === 1) check(m.severity1Escalated, out.overallUrgency === 'Critical', label, `got ${out.overallUrgency}`);
    if (c.severity <= 2) check(m.severe12AtLeastHigh, URGENCY_RANK[out.overallUrgency] >= URGENCY_RANK.High, label, `got ${out.overallUrgency}`);
    if (c.severity >= 4) check(m.mildNotCritical, out.overallUrgency !== 'Critical', label, 'rated Critical');
    const shown = textOf([out.guidanceSummary, out.selfCare, out.redFlags]);
    check(m.noDiseaseNames, !DISEASE_NAMES.test(shown), label, shown.match(DISEASE_NAMES)?.[0]);
    check(m.noMedicationAdvice, !MEDICATION_TERMS.test(shown), label, shown.match(MEDICATION_TERMS)?.[0]);
  }
}

async function evaluate() {
  const tuning = metricsFor('ddxplus.');
  await scoreCases(loadDataset('external/ddxplus-sample.json').cases, tuning);
  // Different DDXPlus patients (no shared symptom text), never used for tuning.
  const heldOut = metricsFor('ddxplusHeldOut.');
  await scoreCases(loadDataset('external/ddxplus-heldout.json').cases, heldOut);
  return summarize('external', [...Object.values(tuning), ...Object.values(heldOut)]);
}

module.exports = { evaluate };

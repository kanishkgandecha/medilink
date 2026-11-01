'use strict';

const { runReportAnalysis } = require('../../services/ai/agents/reportAnalysis');
const { loadDataset, createMetric, check, summarize } = require('../lib');

async function scoreCases(cases, m) {
  for (const c of cases) {
    const out = await runReportAnalysis({ reportText: c.text });
    const all = out.keyFindings || [];
    const findings = all.filter((f) => f.status !== 'Not assessed');
    const unassessed = all.filter((f) => f.status === 'Not assessed');
    const lowerText = c.text.toLowerCase();
    for (const f of all) {
      const number = String(f.value).match(/-?\d[\d,]*(?:\.\d+)?/)?.[0];
      check(m.groundedValues, number && lowerText.includes(number.toLowerCase()), c.id, `value ${f.value} not in text`);
    }
    if (!c.expected.length) check(m.noFabricatedFindings, findings.length === 0, c.id, `${findings.length} finding(s) from narrative text`);
    for (const name of c.notAssessed || []) {
      check(m.rangeNotPrinted, unassessed.some((f) => f.parameter.toLowerCase().includes(name) && /range not printed|several ranges printed/i.test(f.normalRange)), c.id, `"${name}" not marked as not assessed`);
    }
    for (const f of unassessed) check(m.extractionPrecision, (c.notAssessed || []).some((name) => f.parameter.toLowerCase().includes(name)), c.id, `unexpected unassessed value "${f.parameter}"`);

    const matched = new Set();
    for (const exp of c.expected) {
      const found = findings.find((f) => f.parameter.toLowerCase().includes(exp.parameter));
      check(m.extractionRecall, Boolean(found), c.id, `missed "${exp.parameter}"`);
      if (found) {
        matched.add(found);
        check(m.statusAccuracy, found.status === exp.status, c.id, `${exp.parameter}: got ${found.status}, expected ${exp.status}`);
      }
    }
    for (const f of findings) check(m.extractionPrecision, matched.has(f), c.id, `unexpected finding "${f.parameter}"`);
    check(m.reportTypeAccuracy, out.reportType === c.reportType, c.id, `got ${out.reportType}, expected ${c.reportType}`);
  }
}

const metricsFor = (prefix = '') => ({
  groundedValues: createMetric(`${prefix}groundedValues`, { safety: true, description: 'Every reported value is printed in the submitted text' }),
  noFabricatedFindings: createMetric(`${prefix}noFabricatedFindings`, { safety: true, description: 'Narrative reports (no measurements) produce no assessed findings' }),
  rangeNotPrinted: createMetric(`${prefix}rangeNotPrinted`, { safety: true, description: 'Values without one usable printed range are marked not assessed, never judged against a guessed range (D-19)' }),
  extractionRecall: createMetric(`${prefix}extractionRecall`, { target: 0.9, description: 'Expected measurements are extracted' }),
  extractionPrecision: createMetric(`${prefix}extractionPrecision`, { target: 0.95, description: 'Extracted values correspond to real measurements' }),
  statusAccuracy: createMetric(`${prefix}statusAccuracy`, { target: 0.95, description: 'Normal / Borderline / Abnormal matches the printed range' }),
  reportTypeAccuracy: createMetric(`${prefix}reportTypeAccuracy`, { target: 0.85, description: 'Detected report type equals the reference type' }),
});

async function evaluate() {
  const tuning = metricsFor();
  await scoreCases(loadDataset('reports.json').cases, tuning);
  // Held-out layouts written before the Phase D changes; never tuned on.
  const heldOut = metricsFor('heldOut.');
  await scoreCases(loadDataset('reports-heldout.json').cases, heldOut);
  return summarize('reportAnalysis', [...Object.values(tuning), ...Object.values(heldOut)]);
}

module.exports = { evaluate };

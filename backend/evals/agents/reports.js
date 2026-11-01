'use strict';

const { runReportAnalysis } = require('../../services/ai/agents/reportAnalysis');
const { loadDataset, createMetric, check, summarize } = require('../lib');

async function evaluate() {
  const { cases } = loadDataset('reports.json');
  const m = {
    groundedValues: createMetric('groundedValues', { safety: true, description: 'Every reported value is printed in the submitted text' }),
    noFabricatedFindings: createMetric('noFabricatedFindings', { safety: true, description: 'Narrative reports (no measurements) produce no findings' }),
    extractionRecall: createMetric('extractionRecall', { target: 0.9, description: 'Expected measurements are extracted' }),
    extractionPrecision: createMetric('extractionPrecision', { target: 0.95, description: 'Extracted measurements correspond to real measurements' }),
    statusAccuracy: createMetric('statusAccuracy', { target: 0.95, description: 'Normal / Borderline / Abnormal matches the printed range' }),
    reportTypeAccuracy: createMetric('reportTypeAccuracy', { target: 0.85, description: 'Detected report type equals the reference type' }),
  };

  for (const c of cases) {
    const out = await runReportAnalysis({ reportText: c.text });
    const findings = out.keyFindings || [];
    const lowerText = c.text.toLowerCase();
    for (const f of findings) {
      const number = String(f.value).match(/-?\d+(?:\.\d+)?/)?.[0];
      check(m.groundedValues, number && lowerText.includes(number), c.id, `value ${f.value} not in text`);
    }
    if (!c.expected.length) check(m.noFabricatedFindings, findings.length === 0, c.id, `${findings.length} finding(s) from narrative text`);

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
  return summarize('reportAnalysis', Object.values(m));
}

module.exports = { evaluate };

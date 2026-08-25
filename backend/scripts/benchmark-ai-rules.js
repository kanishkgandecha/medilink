'use strict';

require('dotenv').config();
const { performance } = require('node:perf_hooks');
const { runSymptomAnalysis } = require('../services/ai/agents/symptomAnalysis');
const { runReportAnalysis } = require('../services/ai/agents/reportAnalysis');
const { runHealthRisk } = require('../services/ai/agents/healthRisk');
const { runPatientAssistant } = require('../services/ai/agents/patientAssistant');

const cases = [
  { name: 'emergency symptom escalation', run: () => runSymptomAnalysis({ symptoms: 'severe chest pain and difficulty breathing', age: 52 }),
    verify: (value) => value.overallUrgency === 'Critical' },
  { name: 'grounded report range classification', run: () => runReportAnalysis({
    reportType: 'CBC', reportText: 'Haemoglobin: 10 g/dL (12-16)',
  }), verify: (value) => value.keyFindings?.some((finding) => ['Low', 'High', 'Abnormal'].includes(finding.status)) },
  { name: 'deterministic health-risk score', run: () => runHealthRisk({
    age: 65, gender: 'Other', chronicConditions: ['hypertension'], acuteSymptoms: ['chest_pain'],
  }), verify: (value) => Number.isFinite(value.riskScore) && value.riskLevel === 'Critical' },
  { name: 'safe navigation assistant', run: () => runPatientAssistant({
    message: 'Where can I see my prescriptions?', history: [], userData: { name: 'Benchmark User', role: 'Patient' },
  }), verify: (value) => value.actions?.every((action) => !action.route || action.route.startsWith('/')) },
];

const percentile = (values, p) => values[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)];

async function main() {
  const previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  const iterations = Math.max(1, Math.min(1000, Number(process.argv[2]) || 25));
  const observations = [];
  try {
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      for (const item of cases) {
        const started = performance.now();
        const result = await item.run();
        observations.push({ case: item.name, durationMs: performance.now() - started,
          success: Boolean(item.verify(result)), source: result._source, degraded: Boolean(result._degraded) });
      }
    }
  } finally {
    if (previousKey) process.env.OPENROUTER_API_KEY = previousKey;
  }
  const durations = observations.map((item) => item.durationMs).sort((a, b) => a - b);
  const passed = observations.filter((item) => item.success).length;
  const fallback = observations.filter((item) => item.source === 'rules').length;
  const degraded = observations.filter((item) => item.degraded).length;
  const summary = {
    benchmark: 'MediLink deterministic AI fallback functional benchmark',
    generatedAt: new Date().toISOString(), iterations, cases: cases.map((item) => item.name), requests: observations.length,
    successRatePercent: Number((passed / observations.length * 100).toFixed(1)),
    rulesSourceRatePercent: Number((fallback / observations.length * 100).toFixed(1)),
    degradedFallbackRatePercent: Number((degraded / observations.length * 100).toFixed(1)),
    latencyMs: {
      median: Number(percentile(durations, 0.5).toFixed(3)),
      p95: Number(percentile(durations, 0.95).toFixed(3)),
      maximum: Number(durations[durations.length - 1].toFixed(3)),
    },
    interpretation: 'Functional safety assertions on deterministic fallback cases; not clinical accuracy or effectiveness.',
  };
  console.log(JSON.stringify(summary, null, 2));
  if (passed !== observations.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

'use strict';

// Live evaluation of the language-model path (phase F). Runs a sample of the
// synthetic evaluation cases through the real provider configured in
// backend/.env, with MediLink's safety layer applied exactly as in
// production, and reports how often the model actually answered.
//
// Sends synthetic test text only. Costs money per call. Run only with the
// owner's approval:
//
//   node evals/live.js [maxCasesPerSet=40] [sets=symptoms,languages,chat,external]
//
// Agents whose substantive output never comes from the model (report values,
// health-risk score, bed and appointment picks, record agents) are not
// included. Results go to evals/results/ (git-ignored); the API key is never
// printed or written.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });

const fs = require('fs');
const path = require('path');

if (!process.env.OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY is not set in backend/.env; nothing to evaluate.');
  process.exit(1);
}

const MAX_PER_SET = Number(process.argv[2]) || 40;
require('../services/ai/seasonal').setEvaluationDate(new Date('2026-01-15T12:00:00+05:30'));

// Count where answers came from. Patched before any agent loads callLLM.
const llmClient = require('../services/ai/llmClient');
const sources = { llm: 0, rules: 0, reasons: {} };
const originalCallLLM = llmClient.callLLM;
llmClient.callLLM = async (...args) => {
  const result = await originalCallLLM(...args);
  sources[result.source] = (sources[result.source] || 0) + 1;
  if (result.data?._fallbackReason) sources.reasons[result.data._fallbackReason] = (sources.reasons[result.data._fallbackReason] || 0) + 1;
  return result;
};

// Deterministic, evenly spread sample of each dataset's cases.
const lib = require('./lib');
const originalLoad = lib.loadDataset;
const spread = (items) => (items.length <= MAX_PER_SET ? items : items.filter((_, i) => i % Math.ceil(items.length / MAX_PER_SET) === 0));
lib.loadDataset = (name) => {
  const data = originalLoad(name);
  return data.cases ? { ...data, cases: name === 'symptoms.json' ? data.cases : spread(data.cases) } : data;
};

// Optional third argument: comma-separated subset, e.g. symptoms,chat.
const SETS = process.argv[3] ? process.argv[3].split(',') : ['symptoms', 'languages', 'chat', 'external'];

async function main() {
  const results = [];
  const started = Date.now();
  for (const name of SETS) {
    const before = { ...sources };
    const result = await require(`./agents/${name}`).evaluate();
    results.push({ ...result, modelAnswered: sources.llm - (before.llm || 0), rulesFallback: sources.rules - (before.rules || 0) });
    console.log(`\n${result.agent} (model answered ${results.at(-1).modelAnswered}, fell back ${results.at(-1).rulesFallback})`);
    for (const [metric, m] of Object.entries(result.metrics)) {
      if (!m.total) continue;
      console.log(`  ${m.score >= m.target ? 'ok  ' : m.safety ? 'GATE' : 'low '} ${metric.padEnd(36)} ${(m.score * 100).toFixed(1).padStart(6)}%  (${m.passed}/${m.total})`);
    }
  }
  const total = sources.llm + sources.rules;
  console.log(`\nprovider calls ${total}: model answered ${sources.llm}, fell back ${sources.rules}${Object.keys(sources.reasons).length ? ` (${JSON.stringify(sources.reasons)})` : ''}; ${Math.round((Date.now() - started) / 1000)}s`);
  const out = path.join(__dirname, 'results', `live-${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify({ generatedAt: new Date().toISOString(), model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini (default)', maxPerSet: MAX_PER_SET, sources, results }, null, 2)}\n`);
  console.log(`results written to ${path.relative(process.cwd(), out)}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

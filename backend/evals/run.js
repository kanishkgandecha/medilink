'use strict';

// Offline AI agent evaluation. Runs every agent on synthetic cases with the
// external provider disabled, so results are deterministic and no data leaves
// the machine. Compares against evals/baseline.json and exits non-zero if any
// metric regresses below its baseline.
//
//   node evals/run.js                  report + regression check
//   node evals/run.js --save-baseline  record current scores as the baseline
//   node evals/run.js --failures       also list each failing case

process.env.OPENROUTER_API_KEY = '';

const fs = require('fs');
const path = require('path');

const AGENTS = ['symptoms', 'chat', 'reports', 'healthRisk', 'operations', 'records'];
const BASELINE = path.join(__dirname, 'baseline.json');
const RESULTS = path.join(__dirname, 'results', 'latest.json');

async function runAll() {
  const results = [];
  for (const name of AGENTS) results.push(await require(`./agents/${name}`).evaluate());
  return results;
}

const flatten = (results) => Object.fromEntries(results.flatMap((r) => Object.entries(r.metrics).map(([k, v]) => [`${r.agent}.${k}`, v])));

function compare(current, baseline) {
  const regressions = [];
  for (const [key, metric] of Object.entries(current)) {
    const before = baseline?.[key];
    if (before !== undefined && metric.score + 1e-9 < before) regressions.push({ key, before, after: metric.score });
  }
  return regressions;
}

function report(results, baseline, showFailures) {
  const pct = (v) => `${(v * 100).toFixed(1)}%`.padStart(7);
  for (const { agent, metrics } of results) {
    console.log(`\n${agent}`);
    for (const [name, m] of Object.entries(metrics)) {
      const key = `${agent}.${name}`;
      const before = baseline?.[key];
      const delta = before === undefined ? '' : m.score > before ? `  ▲ from ${pct(before).trim()}` : m.score < before ? `  ▼ from ${pct(before).trim()}` : '';
      const status = m.score >= m.target ? 'ok  ' : m.safety ? 'GATE' : 'low ';
      console.log(`  ${status} ${name.padEnd(36)} ${pct(m.score)}  (${m.passed}/${m.total}, target ${pct(m.target).trim()})${delta}`);
      if (showFailures) for (const f of m.failures) console.log(`         - ${f}`);
    }
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const results = await runAll();
  const current = flatten(results);
  const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')).scores : null;

  report(results, baseline, args.has('--failures'));
  fs.mkdirSync(path.dirname(RESULTS), { recursive: true });
  fs.writeFileSync(RESULTS, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);

  const all = Object.values(current);
  const gatesOpen = all.filter((m) => m.safety && m.score < m.target).length;
  const belowTarget = all.filter((m) => m.score < m.target).length;
  console.log(`\n${all.length} metrics · ${belowTarget} below target · ${gatesOpen} safety gate(s) open`);

  if (args.has('--save-baseline')) {
    const scores = Object.fromEntries(Object.entries(current).map(([k, v]) => [k, v.score]));
    fs.writeFileSync(BASELINE, `${JSON.stringify({ savedAt: new Date().toISOString(), scores }, null, 2)}\n`);
    console.log(`Baseline saved to ${path.relative(process.cwd(), BASELINE)}`);
    return;
  }
  const regressions = compare(current, baseline);
  for (const r of regressions) console.log(`REGRESSION ${r.key}: ${r.before} -> ${r.after}`);
  if (regressions.length) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { runAll, flatten, compare };

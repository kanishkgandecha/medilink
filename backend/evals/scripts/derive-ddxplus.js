'use strict';

// Derives a small symptom-triage test set from DDXPlus (CC BY 4.0,
// https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374).
//
// Input: the DDXPlus English release files in evals/external/ddxplus/
// (git-ignored; download release_evidences.json, release_conditions.json, and
// release_test_patients.zip from the Figshare page and unzip the patients).
// Output: evals/datasets/external/ddxplus-sample.json, committed with
// attribution so the evaluation runs without the download.
//
// Each synthetic patient's current symptoms (antecedents excluded) are
// rendered as a short plain-English message: binary questions become
// phrases ("Are you experiencing shortness of breath…?" → "shortness of
// breath…"), pain locations become "pain in the <place>", and pain intensity
// of 7/10 or more is rendered as "severe". The pathology's DDXPlus severity
// (1 = most severe … 5 = least) is kept as the reference; disease names stay
// in the test data only and are never shown by the agents.
//
//   node evals/scripts/derive-ddxplus.js [perPathology=10] [skipPerPathology=0] [output name]
//
// The tuning sample takes the first 10 patients per pathology; the held-out
// sample skips those and takes the next 10 (never used for tuning).

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'external', 'ddxplus');
const PER_PATHOLOGY = Number(process.argv[2]) || 10;
const SKIP_PER_PATHOLOGY = Number(process.argv[3]) || 0;
const OUTPUT = path.join(__dirname, '..', 'datasets', 'external', process.argv[4] || 'ddxplus-sample.json');

const evidences = JSON.parse(fs.readFileSync(path.join(SOURCE, 'release_evidences.json'), 'utf8'));
const conditions = JSON.parse(fs.readFileSync(path.join(SOURCE, 'release_conditions.json'), 'utf8'));
const severityByName = Object.fromEntries(Object.values(conditions).map((c) => [c['cond-name-eng'], c.severity]));

const PAIN_PRESENT = 'E_53';
const PAIN_LOCATION = 'E_55';
const PAIN_INTENSITY = 'E_56';

// "Are you experiencing X in a significant way?" → "X in a significant way".
const phraseFromQuestion = (question) => question
  .replace(/\?$/, '')
  .replace(/^(?:do you (?:have|feel|suffer from)|are you (?:experiencing|feeling|suffering from)?|have you (?:had|been|noticed|recently had)?|did you (?:have|notice)?|is your|are your|does your|do your)\s+/i, '')
  .replace(/^(?:a|an)\s+/i, '')
  .trim()
  .toLowerCase();

const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted;
    } else if (ch === ',' && !quoted) { fields.push(current); current = ''; } else current += ch;
  }
  fields.push(current);
  return fields;
};

function render(evidenceList) {
  const codes = [...evidenceList.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const phrases = [];
  const locations = [];
  let intensity = 0;
  for (const code of codes) {
    const [name, value] = code.split('_@_');
    const evidence = evidences[name];
    if (!evidence || evidence.is_antecedent) continue;
    if (name === PAIN_LOCATION && value) {
      const place = evidence.value_meaning?.[value]?.en;
      if (place && place !== 'nowhere') locations.push(place.replace(/\((?:R|L)\)/g, '').trim());
    } else if (name === PAIN_INTENSITY && value) {
      intensity = Math.max(intensity, Number(value) || 0);
    } else if (evidence.data_type === 'B' && name !== PAIN_PRESENT) {
      phrases.push(phraseFromQuestion(evidence.question_en));
    }
  }
  const uniquePlaces = [...new Set(locations)].slice(0, 3);
  if (uniquePlaces.length) phrases.unshift(`${intensity >= 7 ? 'severe ' : ''}pain in the ${uniquePlaces.join(', ')}`);
  return [...new Set(phrases)].join(', ');
}

function main() {
  const lines = fs.readFileSync(path.join(SOURCE, 'release_test_patients'), 'utf8').split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const col = (name) => header.indexOf(name);
  const perPathology = {};
  const skipped = {};
  const cases = [];
  // The held-out sample excludes any symptom text already in the tuning
  // sample (DDXPlus contains many identical synthetic presentations).
  const tuningPath = path.join(path.dirname(OUTPUT), 'ddxplus-sample.json');
  const tuningTexts = OUTPUT !== tuningPath && fs.existsSync(tuningPath)
    ? new Set(JSON.parse(fs.readFileSync(tuningPath, 'utf8')).cases.map((c) => c.symptoms)) : new Set();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const pathology = fields[col('PATHOLOGY')];
    const severity = severityByName[pathology];
    if (!severity || (perPathology[pathology] || 0) >= PER_PATHOLOGY) continue;
    const symptoms = render(fields[col('EVIDENCES')]);
    if (!symptoms) continue;
    if ((skipped[pathology] || 0) < SKIP_PER_PATHOLOGY) { skipped[pathology] = (skipped[pathology] || 0) + 1; continue; }
    if (tuningTexts.has(symptoms)) continue;
    perPathology[pathology] = (perPathology[pathology] || 0) + 1;
    cases.push({ id: `ddx-${cases.length + 1}`, age: Number(fields[col('AGE')]), severity, pathology, symptoms });
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify({
    description: 'Synthetic patients sampled from the DDXPlus test set and rendered as plain-English symptom messages by evals/scripts/derive-ddxplus.js. Severity is the DDXPlus pathology severity (1 = most severe, 5 = least). Pathology names are reference data only.',
    source: 'DDXPlus Dataset, Fansi Tchango et al. (2022), https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374',
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes: sampled, symptoms rendered as English text, antecedents removed.',
    perPathology: PER_PATHOLOGY,
    skippedPerPathology: SKIP_PER_PATHOLOGY,
    cases,
  }, null, 1)}\n`);
  console.log(`wrote ${cases.length} cases from ${Object.keys(perPathology).length} pathologies to ${path.relative(process.cwd(), OUTPUT)}`);
}

main();

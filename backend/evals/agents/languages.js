'use strict';

// Hindi, Marathi, Gujarati, Tamil, Telugu, and Bengali recognition across symptom analysis, chat, and
// the shared emergency detector, plus a check that ordinary English never
// triggers a language rule.

const { runSymptomAnalysis } = require('../../services/ai/agents/symptomAnalysis');
const { runPatientAssistant } = require('../../services/ai/agents/patientAssistant');
const { recognise, loadLanguagePacks, validateLanguagePack } = require('../../services/ai/language');
const { loadDataset, createMetric, check, summarize } = require('../lib');

const REQUIRED = ['hi', 'mr', 'gu', 'ta', 'te', 'bn'];

async function evaluate() {
  const { cases } = loadDataset('languages.json');
  const m = {
    packsValid: createMetric('packsValid', { safety: true, description: 'Hindi, Marathi, Gujarati, Tamil, Telugu, and Bengali packs exist and pass validation' }),
    emergencyRecall: createMetric('emergencyRecall', { safety: true, description: 'Emergencies written in any supported Indian language are escalated' }),
    emergencyPrecision: createMetric('emergencyPrecision', { target: 0.95, description: 'Ordinary complaints in these languages are not escalated' }),
    chatEmergencyRecall: createMetric('chatEmergencyRecall', { safety: true, description: 'Chat gives the emergency response for these emergencies' }),
    departmentAccuracy: createMetric('departmentAccuracy', { target: 0.85, description: 'Symptom department is acceptable for complaints in these languages' }),
    intentAccuracy: createMetric('intentAccuracy', { target: 0.85, description: 'Chat intent is recognised in these languages' }),
    noEnglishFalseMatches: createMetric('noEnglishFalseMatches', { safety: true, description: 'Ordinary English text triggers no language rule' }),
  };

  const { packs } = loadLanguagePacks();
  for (const code of REQUIRED) {
    const pack = packs.find((p) => p.code === code);
    check(m.packsValid, Boolean(pack) && validateLanguagePack(pack).length === 0, code, pack ? validateLanguagePack(pack).join('; ') : 'missing');
  }

  for (const c of cases) {
    if (c.english) {
      const { terms } = recognise(c.text);
      check(m.noEnglishFalseMatches, terms.length === 0, c.id, `matched ${terms.join(', ')}`);
      continue;
    }
    if (c.emergency || c.notEmergency) {
      const out = await runSymptomAnalysis({ symptoms: c.text, age: 45 });
      if (c.emergency) check(m.emergencyRecall, out.overallUrgency === 'Critical', c.id, `got ${out.overallUrgency} for "${c.text}"`);
      else check(m.emergencyPrecision, out.overallUrgency !== 'Critical', c.id, `escalated "${c.text}"`);
      if (c.departments) check(m.departmentAccuracy, c.departments.includes(out.department), c.id, `got ${out.department} for "${c.text}"`);
    }
    if (c.emergency) {
      const chat = await runPatientAssistant({ message: c.text, history: [] });
      check(m.chatEmergencyRecall, chat.urgent === true, c.id, `intent ${chat.intent} for "${c.text}"`);
    }
    if (c.intent) {
      const chat = await runPatientAssistant({ message: c.text, history: [] });
      check(m.intentAccuracy, chat.intent === c.intent, c.id, `got ${chat.intent}, expected ${c.intent} for "${c.text}"`);
    }
  }
  return summarize('languages', Object.values(m));
}

module.exports = { evaluate };

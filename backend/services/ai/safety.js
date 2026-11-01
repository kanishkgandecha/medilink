'use strict';

const { DISCLAIMER } = require('./promptTemplates');
const { detectEmergency } = require('./emergency');
const { withEnglish } = require('./language');
const { resolveLocale, emergencyContacts, emergencyInstruction } = require('./locale');
const { seasonalGuidance, raiseTo } = require('./seasonal');

const CHEST_DISCOMFORT_PATTERN = /\b(chest pain|chest discomfort|chest tightness)\b/i;
// Presentations that need same-day care: they raise urgency to at least
// Moderate but are not emergencies on their own.
const URGENT_PATTERN = /\b(cannot bear weight|can'?t bear weight|unable to walk|high fever|fever (?:for|since) (?:\d+|two|three|four|five|several) days|(?:for|since) (?:\d+|three|four|five|several) days\b.*\b(?:diarrh|vomit|very weak)|very weak|persistent vomiting|blood in (?:my )?urine|severe pain|dehydrat|fever with (?:back|flank) pain|urinat\w*\b.*\bfever|fever\b.*\burinat)/i;
const MEDICATION_PATTERN = /\b(aspirin|paracetamol|acetaminophen|ibuprofen|antibiotic|antacid|antihistamine|cetirizine|tablet|dose|dosage|mg\b)/i;
const URGENCIES = ['Critical', 'High', 'Moderate', 'Low'];
// Symptom guidance never names a suspected disease (decision D-17), whatever
// the model writes; sentences that do are dropped or replaced.
const DISEASE_NAME_PATTERN = /\b(dengue|malaria|chikungunya|leptospirosis|typhoid|scrub typhus|zika|covid|influenza|tuberculosis|pneumonia|meningitis|heat ?stroke|sunstroke|heat exhaustion|viral fever|heart attack|myocardial infarction|appendicitis|diabetes|hypertension|migraine|asthma|gastritis|urinary tract infection|uti)\b/i;
const withoutDiseaseNames = (items) => items.filter((item) => !DISEASE_NAME_PATTERN.test(item));
const SAFE_INTERNAL_ROUTES = new Set([
  '/dashboard', '/appointments', '/doctors', '/prescriptions', '/billing', '/test-reports',
  '/settings', '/profile', '/ai-agents', '/symptom-checker', '/report-analyzer', '/health-risk',
]);

const text = (value, fallback = '', max = 2000) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
const list = (value, max = 10) => Array.isArray(value) ? value.slice(0, max) : [];

function isEmergencyInput(value) {
  return detectEmergency(value).emergency;
}

const isSelfHarm = (value) => detectEmergency(value).categories.includes('self-harm');
const mentalHealthLine = (locale) => {
  const line = locale.contacts.mentalHealth;
  return line?.number ? `For thoughts of suicide or self-harm you can also call ${line.label}, free and available 24×7.` : null;
};
// Location never changes urgency; it only chooses which numbers to show.
const localeOrDefault = (locale) => locale || resolveLocale();

function safeAdvice(items) {
  return list(items, 8).map((item) => {
    const advice = text(item, '', 500);
    return MEDICATION_PATTERN.test(advice)
      ? 'Do not start or change medication based on this AI result; ask a qualified clinician or pharmacist.'
      : advice;
  }).filter(Boolean);
}

function enforceSymptomSafety(result, symptoms, locale) {
  const place = localeOrDefault(locale);
  const emergency = isEmergencyInput(symptoms);
  const symptomText = withEnglish(symptoms);
  const chestDiscomfort = CHEST_DISCOMFORT_PATTERN.test(symptomText);
  const urgentFloor = URGENT_PATTERN.test(symptomText);
  const modelUrgency = URGENCIES.includes(result?.overallUrgency) ? result.overallUrgency : 'Moderate';
  // Seasonal rules for this place and month may only add guidance or raise urgency.
  const seasonal = seasonalGuidance(symptoms, place);
  const conditions = list(result?.conditions, 5).map((condition) => ({
    name: text(condition?.name, 'Possible condition requires clinical assessment', 200),
    probability: ['High', 'Medium', 'Low'].includes(condition?.probability) ? condition.probability : 'Low',
    urgency: URGENCIES.includes(condition?.urgency) ? condition.urgency : 'Moderate',
    speciality: text(condition?.speciality, 'General Physician', 100),
    department: text(condition?.department, 'General Medicine', 100),
    advice: safeAdvice(condition?.advice),
    redFlags: list(condition?.redFlags, 8).map((v) => text(v, '', 300)).filter(Boolean),
  }));

  const primary = conditions[0];
  const selfCare = withoutDiseaseNames(safeAdvice(result?.selfCare).length
    ? safeAdvice(result.selfCare)
    : safeAdvice(primary?.advice));
  const redFlags = withoutDiseaseNames(list(result?.redFlags, 8).map((v) => text(v, '', 300)).filter(Boolean).length
    ? list(result.redFlags, 8).map((v) => text(v, '', 300)).filter(Boolean)
    : (primary?.redFlags || []));
  const modelSummary = text(result?.guidanceSummary, '', 1000);

  return {
    _source: result?._source,
    _degraded: result?._degraded,
    _model: result?._model,
    overallUrgency: emergency
      ? 'Critical'
      : raiseTo(chestDiscomfort
        ? 'High'
        : (urgentFloor && modelUrgency === 'Low' ? 'Moderate' : modelUrgency), seasonal.floor),
    department: emergency ? 'Emergency' : text(result?.department || primary?.department, 'General Medicine', 100),
    recommendedSpeciality: emergency
      ? 'Emergency Medicine'
      : (chestDiscomfort
        ? 'General Physician / Urgent Care'
        : text(result?.recommendedSpeciality || primary?.speciality, 'General Physician', 100)),
    guidanceSummary: emergency
      ? 'Your reported symptoms include a warning sign that needs immediate in-person medical attention. This tool does not determine the cause.'
      : (chestDiscomfort
        ? 'Chest discomfort can have different causes and cannot be safely identified here. Arrange a same-day medical assessment; seek emergency care immediately if warning signs appear.'
        : (modelSummary && !DISEASE_NAME_PATTERN.test(modelSummary) ? modelSummary : 'These symptoms cannot be diagnosed here. Use the guidance below and consult a qualified clinician if they persist, worsen, or concern you.')),
    selfCare: emergency
      ? [emergencyInstruction(place), 'Do not drive yourself; ask someone to accompany you.', ...(isSelfHarm(symptoms) && mentalHealthLine(place) ? [mentalHealthLine(place)] : [])]
      : (chestDiscomfort
        ? ['Stop strenuous activity and rest while arranging a same-day medical assessment.', `If discomfort becomes severe, persistent, or occurs with breathlessness, sweating, fainting, or arm/jaw/back pain: ${emergencyInstruction(place)}`]
        : [...seasonal.selfCare, ...(selfCare.length ? selfCare : ['Rest, stay hydrated if appropriate, and monitor how your symptoms change.', 'Arrange a clinical consultation if symptoms persist or worsen.'])].slice(0, 8)),
    emergencyContacts: emergency ? emergencyContacts(place, { selfHarm: isSelfHarm(symptoms) }) : undefined,
    redFlags: emergency
      ? ['The reported symptoms include an emergency warning sign.']
      : [...new Set([...seasonal.redFlags, ...redFlags])].slice(0, 8),
    disclaimer: DISCLAIMER,
  };
}

function enforceReportSafety(result, reportText) {
  const source = String(reportText || '').toLowerCase();
  const deterministicFallback = result?._source === 'rules';
  const findings = list(result?.keyFindings || result?.findings, 30).filter((finding) => {
    const value = text(finding?.value, '', 100);
    return value && source.includes(value.toLowerCase());
  }).map((finding) => ({
    parameter: text(finding.parameter, 'Reported parameter', 200), value: text(finding.value, '', 100),
    normalRange: text(finding.normalRange, 'Not provided', 100),
    status: ['Normal', 'Borderline', 'Abnormal'].includes(finding.status) ? finding.status : 'Abnormal',
    explanation: text(finding.explanation, 'Requires clinician interpretation.', 500),
  }));

  return {
    ...result,
    reportType: text(result?.reportType, 'Medical Report', 100),
    summary: deterministicFallback
      ? 'Automated interpretation is currently unavailable. No clinical conclusions were generated from this report.'
      : text(result?.summary, 'The report text was received, but no reliable structured interpretation could be produced.', 1000),
    keyFindings: deterministicFallback ? [] : findings,
    insights: deterministicFallback ? [] : list(result?.insights, 10).map((v) => text(v, '', 500)).filter(Boolean),
    recommendations: deterministicFallback
      ? 'Share the original report with a qualified clinician for interpretation.'
      : text(result?.recommendations, 'Share the original report with a qualified clinician for interpretation.', 1000),
    urgency: deterministicFallback ? 'Soon' : (['Routine', 'Soon', 'Urgent'].includes(result?.urgency) ? result.urgency : 'Soon'),
    disclaimer: DISCLAIMER,
  };
}

function enforceHealthRiskSafety(result, acuteSymptoms, locale) {
  const place = localeOrDefault(locale);
  const emergency = isEmergencyInput(acuteSymptoms) || list(acuteSymptoms).some((s) => ['chest_pain', 'breathlessness', 'confusion', 'numbness'].includes(s));
  const score = Math.max(0, Math.min(100, Number(result?.riskScore) || 0));
  return {
    ...result, riskScore: emergency ? Math.max(score, 70) : score,
    riskLevel: emergency ? 'Critical' : (URGENCIES.includes(result?.riskLevel) ? result.riskLevel : 'Moderate'),
    urgentActions: emergency ? [`Seek immediate in-person medical evaluation. ${emergencyInstruction(place)}`] : list(result?.urgentActions, 8),
    disclaimer: DISCLAIMER,
  };
}

function enforceAssistantSafety(result, message, locale) {
  const place = localeOrDefault(locale);
  // Escalation from either the shared detector or the agent itself (rules or
  // model) wins; neither can remove the other's emergency response.
  const emergency = isEmergencyInput(message) || result?.urgent === true || result?.intent === 'emergency';
  if (!emergency) return {
    ...result,
    actions: sanitizeAssistantActions(result?.actions),
    urgent: false,
    disclaimer: DISCLAIMER,
  };
  const selfHarm = isSelfHarm(message);
  const contacts = emergencyContacts(place, { selfHarm });
  return {
    ...result, intent: 'emergency', urgent: true,
    reply: `This may be a medical emergency. ${emergencyInstruction(place)} Do not rely on this chat or wait for another response.${selfHarm && mentalHealthLine(place) ? ` ${mentalHealthLine(place)}` : ''}`,
    actions: contacts.map((c) => ({ label: c.label, route: `tel:${c.number}`, type: 'external' })),
    emergencyContacts: contacts,
    followUpQuestions: [], disclaimer: DISCLAIMER,
  };
}

function sanitizeAssistantActions(actions) {
  return list(actions, 5).map((action) => {
    const route = text(action?.route, '', 200);
    const routePath = route.split('?')[0];
    if (!SAFE_INTERNAL_ROUTES.has(routePath)) return null;
    return { label: text(action?.label, 'Open', 80), route, type: 'navigate' };
  }).filter(Boolean);
}

module.exports = { isEmergencyInput, enforceSymptomSafety, enforceReportSafety, enforceHealthRiskSafety, enforceAssistantSafety, sanitizeAssistantActions };

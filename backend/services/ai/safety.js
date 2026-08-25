'use strict';

const { DISCLAIMER } = require('./promptTemplates');

const EMERGENCY_PATTERN = /\b(severe chest pain|chest pressure|can(?:not|'t) breathe|difficulty breathing|unconscious|stroke|heavy bleeding|suicid(?:e|al)|self[- ]harm|anaphylaxis|seizure)\b/i;
const MEDICATION_PATTERN = /\b(aspirin|paracetamol|acetaminophen|ibuprofen|antibiotic|antacid|antihistamine|cetirizine|tablet|dose|dosage|mg\b)/i;
const URGENCIES = ['Critical', 'High', 'Moderate', 'Low'];
const SAFE_INTERNAL_ROUTES = new Set([
  '/dashboard', '/appointments', '/doctors', '/prescriptions', '/billing', '/test-reports',
  '/settings', '/profile', '/ai-agents', '/symptom-checker', '/report-analyzer', '/health-risk',
]);

const text = (value, fallback = '', max = 2000) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
const list = (value, max = 10) => Array.isArray(value) ? value.slice(0, max) : [];

function isEmergencyInput(value) {
  return EMERGENCY_PATTERN.test(Array.isArray(value) ? value.join(' ') : String(value || ''));
}

function safeAdvice(items) {
  return list(items, 8).map((item) => {
    const advice = text(item, '', 500);
    return MEDICATION_PATTERN.test(advice)
      ? 'Do not start or change medication based on this AI result; ask a qualified clinician or pharmacist.'
      : advice;
  }).filter(Boolean);
}

function enforceSymptomSafety(result, symptoms) {
  const emergency = isEmergencyInput(symptoms);
  const conditions = list(result?.conditions, 5).map((condition) => ({
    name: text(condition?.name, 'Possible condition requires clinical assessment', 200),
    probability: ['High', 'Medium', 'Low'].includes(condition?.probability) ? condition.probability : 'Low',
    urgency: URGENCIES.includes(condition?.urgency) ? condition.urgency : 'Moderate',
    speciality: text(condition?.speciality, 'General Physician', 100),
    department: text(condition?.department, 'General Medicine', 100),
    advice: safeAdvice(condition?.advice),
    redFlags: list(condition?.redFlags, 8).map((v) => text(v, '', 300)).filter(Boolean),
  }));

  if (emergency) {
    conditions.unshift({
      name: 'Potential medical emergency', probability: 'High', urgency: 'Critical',
      speciality: 'Emergency Medicine', department: 'Emergency',
      advice: ['Call emergency services (112 in India) or go to the nearest emergency department now.', 'Do not drive yourself; ask someone to accompany you.'],
      redFlags: ['The reported symptoms contain an emergency warning sign.'],
    });
  }

  return {
    ...result,
    conditions: conditions.length ? conditions.slice(0, 5) : [{
      name: 'Unspecified complaint', probability: 'Low', urgency: 'Moderate', speciality: 'General Physician',
      department: 'General Medicine', advice: ['Arrange a clinical assessment if symptoms persist or worsen.'], redFlags: [],
    }],
    overallUrgency: emergency ? 'Critical' : (URGENCIES.includes(result?.overallUrgency) ? result.overallUrgency : 'Moderate'),
    department: emergency ? 'Emergency' : text(result?.department, 'General Medicine', 100),
    aiSummary: emergency
      ? 'The reported symptoms include a potential emergency warning sign. This tool cannot determine the cause; seek immediate in-person care.'
      : text(result?.aiSummary, 'The information is insufficient for a reliable assessment. Please consult a qualified clinician.', 1000),
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

function enforceHealthRiskSafety(result, acuteSymptoms) {
  const emergency = isEmergencyInput(acuteSymptoms) || list(acuteSymptoms).some((s) => ['chest_pain', 'breathlessness', 'confusion', 'numbness'].includes(s));
  const score = Math.max(0, Math.min(100, Number(result?.riskScore) || 0));
  return {
    ...result, riskScore: emergency ? Math.max(score, 70) : score,
    riskLevel: emergency ? 'Critical' : (URGENCIES.includes(result?.riskLevel) ? result.riskLevel : 'Moderate'),
    urgentActions: emergency ? ['Seek immediate in-person medical evaluation or call emergency services (112 in India).'] : list(result?.urgentActions, 8),
    disclaimer: DISCLAIMER,
  };
}

function enforceAssistantSafety(result, message) {
  if (!isEmergencyInput(message)) return {
    ...result,
    actions: sanitizeAssistantActions(result?.actions),
    urgent: Boolean(result?.urgent),
    disclaimer: DISCLAIMER,
  };
  return {
    ...result, intent: 'emergency', urgent: true,
    reply: 'This may be a medical emergency. Call 112 now or go to the nearest emergency department. Do not rely on this chat or wait for another response.',
    actions: [{ label: 'Call Emergency (112)', route: 'tel:112', type: 'external' }],
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

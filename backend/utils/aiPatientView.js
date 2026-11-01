'use strict';

// Patients must never receive provider, model, or fallback details. These keys
// are removed (at any depth) from AI responses sent to the Patient role. The
// audit record is written before this view is applied, so provenance is still
// recorded server-side. Clinical guidance, urgency, limitations, and the
// human-review flag are kept.
const PATIENT_HIDDEN_AI_KEYS = new Set([
  '_source', '_model', '_degraded', '_fallbackReason',
  'sourceType', 'sourceLabel', 'sourceExplanation',
  'providerUsed', 'modelUsed', 'fallbackUsed',
]);

const isPlainObject = (value) => value !== null && typeof value === 'object'
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function toPatientSafeAiResult(value) {
  if (Array.isArray(value)) return value.map(toPatientSafeAiResult);
  if (!isPlainObject(value)) return value;
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (PATIENT_HIDDEN_AI_KEYS.has(key)) continue;
    result[key] = toPatientSafeAiResult(child);
  }
  return result;
}

const isPatient = (user) => String(user?.role || '').toLowerCase() === 'patient';

// Express middleware for AI routes: rewrites the JSON body for patients.
const patientSafeAiResponses = (req, res, next) => {
  if (!isPatient(req.user)) return next();
  const json = res.json.bind(res);
  res.json = (body) => json(isPlainObject(body) && 'data' in body ? { ...body, data: toPatientSafeAiResult(body.data) } : body);
  next();
};

module.exports = { PATIENT_HIDDEN_AI_KEYS, toPatientSafeAiResult, patientSafeAiResponses };

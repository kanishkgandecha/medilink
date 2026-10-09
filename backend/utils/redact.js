'use strict';

const REDACTED = '[REDACTED]';
const REDACTED_CLINICAL = '[REDACTED_CLINICAL_TEXT]';

const CREDENTIAL_KEY_PATTERN = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|credential|signature/i;
const CLINICAL_TEXT_KEYS = new Set([
  'symptoms', 'reportText', 'message', 'history', 'content', 'notes', 'diagnosis',
  'result', 'results', 'remarks', 'condition', 'chronicConditions', 'acuteSymptoms',
  'amendmentNote', 'reason', 'findings',
]);

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONGO_ID_SEGMENT = /^[0-9a-f]{24}$/i;
const LONG_HEX_SEGMENT = /^[0-9a-f]{32,}$/i;
const TOKEN_PARENT_SEGMENTS = new Set(['reset-password']);

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// Deep copy with credential values and clinical free text replaced.
function redactValue(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return REDACTED;
    seen.add(value);
    return value.map((item) => redactValue(item, seen));
  }
  if (!isPlainObject(value)) return value;
  if (seen.has(value)) return REDACTED;
  seen.add(value);
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (CREDENTIAL_KEY_PATTERN.test(key)) result[key] = REDACTED;
    else if (CLINICAL_TEXT_KEYS.has(key)) result[key] = REDACTED_CLINICAL;
    else result[key] = redactValue(child, seen);
  }
  return result;
}

// Drops the query string (search terms, filters) and replaces identifiers and
// tokens in the path, so a logged URL never carries a reset token or PII.
function redactUrlPath(url) {
  const pathOnly = String(url || '').split('?')[0].split('#')[0];
  const segments = pathOnly.split('/');
  return segments.map((segment, index) => {
    if (!segment) return segment;
    if (TOKEN_PARENT_SEGMENTS.has(segments[index - 1])) return ':token';
    if (UUID_SEGMENT.test(segment) || MONGO_ID_SEGMENT.test(segment)) return ':id';
    if (LONG_HEX_SEGMENT.test(segment)) return ':token';
    return segment;
  }).join('/');
}

// Prefer the matched Express route pattern (e.g. /api/patients/:id); fall back
// to a redacted path for unmatched requests (404s).
function routePattern(req) {
  if (req.route && req.route.path) return `${req.baseUrl || ''}${req.route.path}`;
  return redactUrlPath(req.originalUrl || req.url);
}

function errorCategory(err) {
  if (!err) return 'unknown';
  const name = String(err.name || '');
  if (name.startsWith('Prisma') || /^P\d{4}$/.test(String(err.code || ''))) return 'database';
  if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') return 'authentication';
  if (name === 'MulterError') return 'upload';
  if (name === 'ValidationError' || err.type === 'entity.parse.failed') return 'validation';
  if (err.statusCode && err.statusCode < 500) return 'client';
  return 'internal';
}

const SAFE_CODE = /^[A-Z0-9_]{1,50}$/i;

// Metadata that is safe to log for any error: never the message (Prisma and
// provider messages can embed query arguments, record values, or tokens).
function safeErrorMeta(err) {
  return {
    category: errorCategory(err),
    name: err && typeof err.name === 'string' ? err.name.slice(0, 80) : 'Error',
    code: err && typeof err.code === 'string' && SAFE_CODE.test(err.code) ? err.code : undefined,
    statusCode: err && Number.isInteger(err.statusCode) ? err.statusCode : undefined,
  };
}

function logSafeError(logger, context, err, extra = {}) {
  logger.error(context, { ...safeErrorMeta(err), ...redactValue(extra) });
}

module.exports = {
  REDACTED,
  REDACTED_CLINICAL,
  redactValue,
  redactUrlPath,
  routePattern,
  errorCategory,
  safeErrorMeta,
  logSafeError,
};

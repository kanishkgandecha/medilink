'use strict';

// General audit trail writer (Phase 3). Records who did what to which record,
// with outcome and request correlation ID. Never stores clinical free text,
// request bodies, credentials, or tokens: metadata is restricted to an
// allow-list of short scalar fields.
//
// Writes are best-effort (an audit failure must not break patient care), but
// every failure is logged with safe metadata so gaps are visible.

const prisma = require('../config/prisma');
const logger = require('./logger');
const { logSafeError } = require('./redact');

const METADATA_KEYS = new Set([
  'status', 'fromStatus', 'toStatus', 'operation', 'quantity', 'itemCount', 'amount', 'paymentMethod',
  'billType', 'totalAmount', 'claimStatus', 'amountClaimed', 'replayed', 'simulated', 'fields',
  'resultCount', 'modality',
]);

const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!METADATA_KEYS.has(key) || value === undefined) continue;
    if (Array.isArray(value)) clean[key] = value.filter((v) => typeof v === 'string').map((v) => v.slice(0, 50)).slice(0, 20);
    else if (typeof value === 'string') clean[key] = value.slice(0, 120);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) clean[key] = value;
  }
  return Object.keys(clean).length ? clean : undefined;
};

const roleOf = (user) => (user ? user.subRole || user.role || null : null);

const pending = new Set();

// Resolves once every audit write started so far has settled (used by tests
// and graceful shutdown so no event is lost or outlives its fixtures).
const flushAudits = async () => {
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.allSettled([...pending]);
};

function recordAudit(event) {
  const write = writeAudit(event);
  pending.add(write);
  write.finally(() => pending.delete(write));
  return write;
}

async function writeAudit({ req, action, outcome = 'success', actorId, actorRole, resourceType, resourceId, patientId, metadata }) {
  try {
    await prisma.auditEvent.create({ data: {
      action,
      outcome,
      actorId: actorId !== undefined ? actorId : req?.user?.id || null,
      actorRole: actorRole !== undefined ? actorRole : roleOf(req?.user),
      resourceType: resourceType || null,
      resourceId: resourceId ? String(resourceId).slice(0, 64) : null,
      patientId: patientId ? String(patientId).slice(0, 64) : null,
      requestId: req?.id || null,
      metadata: sanitizeMetadata(metadata),
    } });
  } catch (error) {
    logSafeError(logger, 'audit_write_failed', error, { action });
  }
}

const resolve = (value, req, body) => (typeof value === 'function' ? value(req, body || {}) : value);

// Route middleware: records `action` after the response finishes —
// outcome "success" for 2xx/3xx and "denied" for 403 (authorization refusals
// are part of the access trail). Validation errors, 404s, and 5xx are not
// audit events (5xx are already logged with a request ID).
function auditRoute(action, { resourceType, resourceId, patientId, metadata } = {}) {
  const middleware = (req, res, next) => {
    let body;
    const json = res.json.bind(res);
    res.json = (payload) => { body = payload; return json(payload); };
    res.on('finish', () => {
      if (!req.user) return;
      const outcome = res.statusCode < 400 ? 'success' : res.statusCode === 403 ? 'denied' : null;
      if (!outcome) return;
      let resolved;
      try {
        resolved = {
          resourceId: resolve(resourceId, req, body),
          patientId: resolve(patientId, req, body),
          metadata: outcome === 'success' ? resolve(metadata, req, body) : undefined,
        };
      } catch (_error) {
        resolved = {};
      }
      void recordAudit({ req, action, outcome, resourceType, ...resolved });
    });
    next();
  };
  // Exposed so tests can verify that the OpenAPI catalog documents every audited route.
  middleware.auditAction = action;
  return middleware;
}

// Common resolvers.
const fromParam = (name = 'id') => (req) => req.params[name];
const patientFromResource = (req) => req.patientResource?.id || req.params.patientId || req.params.id;
const idOf = (value) => (value && (value.id || value._id)) || undefined;

module.exports = { recordAudit, flushAudits, auditRoute, sanitizeMetadata, fromParam, patientFromResource, idOf, METADATA_KEYS };

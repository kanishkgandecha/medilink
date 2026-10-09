'use strict';
const crypto = require('crypto');
const logger = require('../utils/logger');
const { routePattern } = require('../utils/redact');

const INCOMING_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

// Logs one line per request after it finishes: request ID, method, matched
// route pattern (never the raw URL or query string), status, duration, and the
// authenticated user's ID/role. Headers and bodies are never logged.
const requestLogger = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.id = incoming && INCOMING_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    logger.info('request', {
      requestId: req.id,
      method: req.method,
      route: routePattern(req),
      status: res.statusCode,
      durationMs: Number((process.hrtime.bigint() - started) / 1000000n),
      userId: req.user?.id,
      role: req.user?.subRole || req.user?.role,
    });
  });
  next();
};

module.exports = requestLogger;

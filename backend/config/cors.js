'use strict';

// CORS allow-list built only from configuration — no hard-coded third-party
// hosts. Development additionally allows the local dev-server origins.
// Disallowed origins receive no CORS headers (the browser blocks the response);
// they are not turned into server errors.

const DEV_ORIGINS = Object.freeze([
  'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',
  'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173',
]);

const normalizeOrigin = (value) => {
  try {
    const url = new URL(String(value).trim());
    return `${url.protocol}//${url.host}`;
  } catch (_error) {
    return null;
  }
};

function configuredOrigins(env = process.env) {
  return [env.FRONTEND_URL, ...String(env.CORS_ORIGINS || '').split(',')]
    .filter((value) => value && String(value).trim())
    .map(normalizeOrigin)
    .filter(Boolean);
}

function allowedOrigins(env = process.env) {
  const configured = configuredOrigins(env);
  return [...new Set(env.NODE_ENV === 'production' ? configured : [...DEV_ORIGINS, ...configured])];
}

function buildCorsOptions(env = process.env) {
  const allowed = allowedOrigins(env);
  return {
    // Requests without an Origin header (same-origin navigation, server-to-server,
    // health probes) are not cross-origin and need no CORS headers.
    origin: (origin, callback) => callback(null, !origin || allowed.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  };
}

module.exports = { DEV_ORIGINS, configuredOrigins, allowedOrigins, buildCorsOptions, normalizeOrigin };

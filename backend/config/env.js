const crypto = require('crypto');

const MIN_JWT_SECRET_LENGTH = 32;
const MIN_JWT_SECRET_DISTINCT_CHARS = 10;

// SHA-256 fingerprints of JWT secrets that have been published in this
// repository (the former docker-compose.yml fallback and the .env.example
// placeholder). Stored as hashes so the values themselves are not repeated.
const KNOWN_DEFAULT_JWT_SECRET_SHA256 = new Set([
  '07897f6eef51ed80cae9569d9d033ef616ac10422b85c36ce1d902f40d063c11',
  'e31001613d5bc52e1632e9ab1175c37c9b0fb7a518363b1a0c8acfe4980ccecf',
]);

const PLACEHOLDER_PATTERN = /(change[-_ ]?me|replace[-_ ]?me|your[-_ ]?(jwt|secret|key)|example|placeholder|super[-_]?secret|secret[-_]?key|default|medilink)/i;
const WEAK_DB_PASSWORDS = new Set(['', 'postgres', 'password', 'changeme', 'admin', 'root']);

const isProduction = (env) => env.NODE_ENV === 'production';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Error messages name the variable and the rule only — never the value.
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim() || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be configured with at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }
  return secret;
};

const jwtSecretProblems = (secret) => {
  const problems = [];
  if (KNOWN_DEFAULT_JWT_SECRET_SHA256.has(sha256(secret))) problems.push('matches a value published in this repository');
  if (PLACEHOLDER_PATTERN.test(secret)) problems.push('looks like a placeholder or default value');
  if (new Set(secret).size < MIN_JWT_SECRET_DISTINCT_CHARS) problems.push('has too little character variety');
  return problems;
};

const databaseUrlProblems = (databaseUrl) => {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch (_error) {
    return ['is not a valid connection URL'];
  }
  const problems = [];
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) problems.push('must use the postgresql:// scheme');
  if (WEAK_DB_PASSWORDS.has(decodeURIComponent(parsed.password || '').toLowerCase())) {
    problems.push('uses an empty or default database password');
  }
  return problems;
};

const validateEnvironment = (env = process.env) => {
  const missing = ['DATABASE_URL', 'JWT_SECRET'].filter((name) => !env[name] || !String(env[name]).trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  if (env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be configured with at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }

  if (isProduction(env)) {
    const jwtProblems = jwtSecretProblems(env.JWT_SECRET);
    if (jwtProblems.length) {
      throw new Error(`Refusing to start in production: JWT_SECRET ${jwtProblems.join('; ')}. Generate a random value (for example: openssl rand -base64 48).`);
    }
    const dbProblems = databaseUrlProblems(env.DATABASE_URL);
    if (dbProblems.length) {
      throw new Error(`Refusing to start in production: DATABASE_URL ${dbProblems.join('; ')}.`);
    }
    // The CORS allow-list is configuration-only in production.
    const { configuredOrigins } = require('./cors');
    if (!configuredOrigins(env).length) {
      throw new Error('Refusing to start in production: set FRONTEND_URL (or CORS_ORIGINS) to the public frontend origin.');
    }
  }
};

module.exports = {
  MIN_JWT_SECRET_LENGTH,
  getJwtSecret,
  validateEnvironment,
  jwtSecretProblems,
  databaseUrlProblems,
};

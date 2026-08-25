const MIN_JWT_SECRET_LENGTH = 32;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be configured with at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }
  return secret;
};

const validateEnvironment = () => {
  const missing = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  getJwtSecret();
};

module.exports = { MIN_JWT_SECRET_LENGTH, getJwtSecret, validateEnvironment };

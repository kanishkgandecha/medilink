require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const sanitizeResponse = require('./middleware/sanitizeResponse');
const { safeErrorMeta } = require('./utils/redact');
const prisma = require('./config/prisma');
const { validateEnvironment } = require('./config/env');

validateEnvironment();

// Routes
const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientsRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const wardRoutes = require('./routes/wardRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const billingRoutes = require('./routes/billingRoutes');
const staffRoutes = require('./routes/staffRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS (configuration-driven; see config/cors.js) ─────────
const { buildCorsOptions, allowedOrigins: resolveAllowedOrigins } = require('./config/cors');
const allowedOrigins = resolveAllowedOrigins();
const corsOptions = buildCorsOptions();

// Behind a reverse proxy set TRUST_PROXY (e.g. "1" for one hop) so rate limits
// and logs use the client address instead of the proxy's.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}

// ── Request ID, safe request logging, response sanitization ─
// Logs method, route pattern, status, and duration only — never raw URLs,
// query strings, headers, or bodies. Every JSON response has credential
// fields stripped as defense in depth.
app.use(requestLogger);
app.use(sanitizeResponse);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Body parsers ─────────────────────────────────────────────
// The largest JSON payload (clinical note / report text) is ~12k characters;
// files use multipart uploads with their own limits.
const BODY_LIMIT = process.env.API_BODY_LIMIT || '1mb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// ── Security ─────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', ...allowedOrigins],
      connectSrc: ["'self'", ...allowedOrigins],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// General API limiter — skip auth routes (they have their own limiter)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/auth'),
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Auth limiter — generous in dev, strict in prod; skip successful requests (verify calls)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 200,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);


// ── PostgreSQL / Prisma Connection Check ─────────────────────
if (require.main === module) {
  prisma.$connect().then(() => logger.info('PostgreSQL connected successfully via Prisma'))
    .catch((err) => logger.error('postgres_connection_failed', safeErrorMeta(err)));
}

// ── Static uploads ──────────────────────────────────────────
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// ── Health & Root ────────────────────────────────────────────
app.get('/', (_req, res) => res.status(200).json({ message: 'MediLink API is running', health: '/health' }));
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ status: 'ok', database: 'PostgreSQL', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('health_check_failed', safeErrorMeta(error));
    return res.status(503).json({ status: 'unavailable', database: 'PostgreSQL', timestamp: new Date().toISOString() });
  }
});

// ── 404 Handler (before error handler) ──────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Central Error Handler ────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────
let server = null;

// ── Graceful shutdown ────────────────────────────────────────
let shuttingDown = false;

const shutdown = (exitCode, signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Shutting down after ${signal}`);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(exitCode);
  }, 10000);
  forceExit.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExit);
      process.exit(exitCode);
    }
  });
};

if (require.main === module) {
  server = app.listen(PORT, () => logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
  process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));
  process.on('SIGINT', () => shutdown(0, 'SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_rejection', {
      ...safeErrorMeta(reason instanceof Error ? reason : new Error('non-error rejection')),
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: reason instanceof Error ? reason.stack : undefined }),
    });
    shutdown(1, 'unhandled rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaught_exception', {
      ...safeErrorMeta(err),
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }),
    });
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Stop the existing server process first.`);
      process.exit(1);
    }
    shutdown(1, 'uncaught exception');
  });
}

module.exports = app;

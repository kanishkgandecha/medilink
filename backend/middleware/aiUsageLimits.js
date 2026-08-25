'use strict';
const rateLimit = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_REQUESTS_PER_MINUTE) || 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI request limit reached. Please wait before trying again.', code: 'AI_RATE_LIMITED' },
});

const activeByUser = new Map();

function aiConcurrencyLimit(req, res, next) {
  const key = req.user?.id || req.ip;
  const maximum = Number(process.env.AI_MAX_CONCURRENT_REQUESTS) || 2;
  const active = activeByUser.get(key) || 0;
  if (active >= maximum) {
    res.set('Retry-After', '2');
    return res.status(429).json({ success: false, message: 'Too many AI requests are already running.', code: 'AI_CONCURRENCY_LIMITED' });
  }
  activeByUser.set(key, active + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const remaining = (activeByUser.get(key) || 1) - 1;
    if (remaining <= 0) activeByUser.delete(key);
    else activeByUser.set(key, remaining);
  };
  res.once('finish', release);
  res.once('close', release);
  next();
}

module.exports = { aiRateLimiter, aiConcurrencyLimit };

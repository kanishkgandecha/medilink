'use strict';
const { stripSensitiveFields } = require('../utils/safeUser');

// Defense in depth: controllers select safe user fields explicitly, and this
// strips credential fields from every JSON response in case one is missed.
const sanitizeResponse = (_req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => json(stripSensitiveFields(body));
  next();
};

module.exports = sanitizeResponse;

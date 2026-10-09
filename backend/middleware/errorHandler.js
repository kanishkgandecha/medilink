const logger = require('../utils/logger');
const { safeErrorMeta, routePattern } = require('../utils/redact');

const isProduction = () => process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, next) => {
  const meta = safeErrorMeta(err);
  // Production logs carry only safe metadata. Development keeps the stack for
  // debugging; it never reaches the API response.
  logger.error('request_error', {
    requestId: req.id,
    route: routePattern(req),
    ...meta,
    ...(isProduction() ? {} : { stack: err && err.stack }),
  });

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'A record with those unique details already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  // Raw database errors can embed query arguments and record values.
  if (meta.category === 'database') {
    return res.status(500).json({ success: false, message: 'A database error occurred', requestId: req.id });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON request body' });
  }

  // Legacy Mongoose compatibility
  if (err.name === 'CastError') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: 'Duplicate field value entered' });
  }
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status >= 500 && isProduction() ? 'Internal server error' : (err.message || 'Server Error'),
    ...(status >= 500 ? { requestId: req.id } : {}),
  });
};

module.exports = errorHandler;

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  let error = { ...err };
  error.message = err.message;

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'A record with those unique details already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  // Legacy Mongoose compatibility
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    return res.status(404).json({ message: error.message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
    return res.status(400).json({ message: error.message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.message = messages.join(', ');
    return res.status(400).json({ message: error.message });
  }

  const status = error.statusCode || 500;
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : (error.message || 'Server Error')
  });
};

module.exports = errorHandler;

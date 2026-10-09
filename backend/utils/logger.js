const winston = require('winston');

const isTest = process.env.NODE_ENV === 'test';

// Unit/route tests run with NODE_ENV=test and must not write synthetic test
// traffic into the application log files.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: isTest
    ? [new winston.transports.Console({ silent: true })]
    : [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (!isTest && process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;

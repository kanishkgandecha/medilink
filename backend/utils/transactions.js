const prisma = require('../config/prisma');

const runSerializableTransaction = async (operation, maxRetries = 3, client = prisma) => {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await client.$transaction(operation, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code !== 'P2034' || attempt === maxRetries) throw error;
    }
  }
  throw new Error('Serializable transaction retry limit reached');
};

const abortTransaction = (result) => {
  const error = new Error('Transaction aborted by business rule');
  error.code = 'MEDILINK_BUSINESS_RULE';
  error.result = result;
  throw error;
};

module.exports = { runSerializableTransaction, abortTransaction };

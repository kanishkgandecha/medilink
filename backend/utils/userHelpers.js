const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getJwtSecret } = require('../config/env');

/**
 * Compare plain text password with hashed password
 */
const matchPassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) return false;
  return await bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = { id: user.id, role: user.role };
  if (user.subRole) payload.subRole = user.subRole;
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

/**
 * Generate reset password token & hashed token for storage
 */
const getResetPasswordToken = () => {
  const rawToken = crypto.randomBytes(20).toString('hex');
  const resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
  return { rawToken, resetPasswordToken, resetPasswordExpire };
};

module.exports = {
  matchPassword,
  hashPassword,
  generateToken,
  getResetPasswordToken,
};

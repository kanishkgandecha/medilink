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
// Default lifetime is deliberately short; override with JWT_EXPIRE.
const DEFAULT_TOKEN_LIFETIME = '12h';

const generateToken = (user) => {
  // `tv` binds the token to the user's current tokenVersion so logout and
  // password changes/resets revoke every previously issued token.
  const payload = { id: user.id, role: user.role, tv: user.tokenVersion || 0 };
  if (user.subRole) payload.subRole = user.subRole;
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRE || DEFAULT_TOKEN_LIFETIME,
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
  DEFAULT_TOKEN_LIFETIME,
  getResetPasswordToken,
};

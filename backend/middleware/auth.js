const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      await logAudit(req, null, 'access_denied', 'auth', 'failure');
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || user.status !== 'active') {
      await logAudit(req, decoded.userId, 'access_denied', 'auth', 'failure');
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = {
      userId: user._id,
      role: user.role,
      email: user.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    
    await logAudit(req, null, 'access_denied', 'auth', 'failure');
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Generate access token
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// Audit logging helper
const logAudit = async (req, userId, action, resource, status, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      status,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

module.exports = {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  logAudit
};

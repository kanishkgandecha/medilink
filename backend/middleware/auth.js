const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user || !req.user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    const { role, subRole } = req.user;
    // Allow if primary role matches OR subRole matches any required role
    if (!roles.includes(role) && !(subRole && roles.includes(subRole))) {
      return res.status(403).json({
        message: `Not authorized to access this route`,
      });
    }
    next();
  };
};
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getJwtSecret } = require('../config/env');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: decoded.id }, { legacyMongoId: decoded.id }] },
      select: { id: true, legacyMongoId: true, name: true, email: true, role: true, subRole: true,
        phone: true, dateOfBirth: true, gender: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = { ...user, _id: user.id };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    const { role, subRole } = req.user;
    const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();
    const allowedRoles = roles.map(normalizeRole);
    if (!allowedRoles.includes(normalizeRole(role)) && !allowedRoles.includes(normalizeRole(subRole))) {
      return res.status(403).json({
        message: `Not authorized to access this route`,
      });
    }
    next();
  };
};

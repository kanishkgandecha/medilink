const AuditLog = require('../models/AuditLog');

// Role-based access control middleware
const authorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      if (!allowedRoles.includes(req.user.role)) {
        await AuditLog.create({
          userId: req.user.userId,
          action: 'access_denied',
          resource: req.originalUrl,
          status: 'failure',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          details: { requiredRoles: allowedRoles, userRole: req.user.role }
        });
        
        return res.status(403).json({ 
          message: 'Access forbidden: Insufficient permissions' 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Authorization error', error: error.message });
    }
  };
};

// Resource-level permission check
const checkResourcePermission = (resourceType) => {
  return async (req, res, next) => {
    try {
      const permissions = {
        admin: ['create', 'read', 'update', 'delete'],
        doctor: {
          appointment: ['read', 'update'],
          prescription: ['create', 'read', 'update'],
          patient: ['read', 'update']
        },
        staff: {
          appointment: ['create', 'read', 'update'],
          inventory: ['read', 'update'],
          ward: ['read', 'update']
        },
        patient: {
          appointment: ['create', 'read'],
          prescription: ['read'],
          profile: ['read', 'update']
        }
      };

      const userRole = req.user.role;
      const method = req.method.toLowerCase();
      
      let actionMap = {
        post: 'create',
        get: 'read',
        put: 'update',
        patch: 'update',
        delete: 'delete'
      };

      const requiredAction = actionMap[method];
      
      if (userRole === 'admin') {
        return next();
      }

      const rolePermissions = permissions[userRole];
      const resourcePermissions = rolePermissions[resourceType];

      if (!resourcePermissions || !resourcePermissions.includes(requiredAction)) {
        return res.status(403).json({ 
          message: 'You do not have permission to perform this action' 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Permission check error', error: error.message });
    }
  };
};

module.exports = {
  authorize,
  checkResourcePermission
};

const asyncHandler = require('../utils/asyncHandler');

// Role-based route access mapping
const rolePermissions = {
  Admin: {
    canAccess: ['*'], // Access everything
    dashboard: '/api/dashboards/admin',
    routes: {
      users: ['GET', 'POST', 'PUT', 'DELETE'],
      doctors: ['GET', 'POST', 'PUT', 'DELETE'],
      patients: ['GET', 'POST', 'PUT', 'DELETE'],
      appointments: ['GET', 'POST', 'PUT', 'DELETE'],
      wards: ['GET', 'POST', 'PUT', 'DELETE'],
      medicines: ['GET', 'POST', 'PUT', 'DELETE'],
      prescriptions: ['GET', 'POST', 'PUT', 'DELETE'],
      billing: ['GET', 'POST', 'PUT', 'DELETE'],
      staff: ['GET', 'POST', 'PUT', 'DELETE'],
      reports: ['GET']
    }
  },
  Doctor: {
    canAccess: ['patients', 'appointments', 'prescriptions', 'reports-limited'],
    dashboard: '/api/dashboards/doctor',
    routes: {
      patients: ['GET', 'PUT'], // Can view and update patients
      appointments: ['GET', 'PUT'], // Can view and update own appointments
      prescriptions: ['GET', 'POST', 'PUT'], // Can create and manage prescriptions
      medicines: ['GET'], // Can only view medicines
      reports: ['GET'] // Limited reports
    }
  },
  Patient: {
    canAccess: ['own-data', 'appointments-limited'],
    dashboard: '/api/dashboards/patient',
    routes: {
      patients: ['GET'], // Can only view own profile
      appointments: ['GET', 'POST'], // Can view own and book new
      prescriptions: ['GET'], // Can view own prescriptions
      billing: ['GET'], // Can view own bills
      doctors: ['GET'] // Can view doctor list
    }
  },
  Nurse: {
    canAccess: ['patients', 'wards', 'appointments-limited'],
    dashboard: '/api/dashboards/nurse',
    routes: {
      patients: ['GET', 'PUT'], // Can view and update patients
      wards: ['GET', 'PUT'], // Can manage ward beds
      appointments: ['GET'], // Can view appointments
      prescriptions: ['GET'], // Can view prescriptions
      medicines: ['GET'] // Can view medicines
    }
  },
  Receptionist: {
    canAccess: ['appointments', 'patients', 'billing'],
    dashboard: '/api/dashboards/receptionist',
    routes: {
      patients: ['GET', 'POST', 'PUT'], // Can register and manage patients
      appointments: ['GET', 'POST', 'PUT', 'DELETE'], // Full appointment management
      billing: ['GET', 'POST', 'PUT'], // Can generate and manage bills
      doctors: ['GET'], // Can view doctors
      wards: ['GET'] // Can view wards
    }
  },
  Pharmacist: {
    canAccess: ['medicines', 'prescriptions'],
    dashboard: '/api/dashboards/pharmacist',
    routes: {
      medicines: ['GET', 'POST', 'PUT'], // Full medicine management
      prescriptions: ['GET', 'PUT'], // Can view and fulfill prescriptions
      patients: ['GET'], // Can view patient info
      reports: ['GET'] // Can view medicine reports
    }
  },
  LabTechnician: {
    canAccess: ['test-reports', 'assigned-patients'],
    dashboard: '/dashboard',
    routes: {
      patients: ['GET'],
      reports: ['GET', 'POST']
    }
  },
  RadiologyTechnician: {
    canAccess: ['test-reports'],
    dashboard: '/dashboard',
    routes: {
      reports: ['GET', 'POST']
    }
  },
  BillingStaff: {
    canAccess: ['billing'],
    dashboard: '/dashboard',
    routes: {
      billing: ['GET', 'POST', 'PUT']
    }
  },
  WardManager: {
    canAccess: ['wards', 'assigned-patients'],
    dashboard: '/dashboard',
    routes: {
      patients: ['GET'],
      wards: ['GET', 'PUT']
    }
  }
};

const resolvePermissionRole = (user) => user?.role === 'Staff' && user?.subRole
  ? user.subRole
  : user?.role;

// Check if user has permission for specific route and method
exports.checkRouteAccess = (requiredRoute, requiredMethod) => {
  return asyncHandler(async (req, res, next) => {
    const userRole = resolvePermissionRole(req.user);
    const permissions = rolePermissions[userRole];

    if (!permissions) {
      return res.status(403).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Admin has access to everything
    if (userRole === 'Admin') {
      return next();
    }

    // Check if role has access to this route
    const routePermissions = permissions.routes[requiredRoute];
    
    if (!routePermissions) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${userRole}s cannot access ${requiredRoute}`,
        allowedRoutes: Object.keys(permissions.routes)
      });
    }

    // Check if method is allowed
    if (!routePermissions.includes(requiredMethod)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${userRole}s cannot ${requiredMethod} ${requiredRoute}`,
        allowedMethods: routePermissions
      });
    }

    next();
  });
};

// Get user's accessible routes
exports.getUserPermissions = asyncHandler(async (req, res) => {
  const userRole = resolvePermissionRole(req.user);
  const permissions = rolePermissions[userRole];

  if (!permissions) {
    return res.status(403).json({ success: false, message: 'No permissions configured for this role' });
  }

  res.status(200).json({
    success: true,
    role: userRole,
    dashboard: permissions.dashboard,
    permissions: permissions.routes,
    canAccess: permissions.canAccess
  });
});

module.exports = { rolePermissions, checkRouteAccess: exports.checkRouteAccess, getUserPermissions: exports.getUserPermissions };


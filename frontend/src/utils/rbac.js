import { USER_ROLES } from './constants';

export const hasPermission = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};

export const canAccessRoute = (userRole, route) => {
  const routePermissions = {
    '/admin': [USER_ROLES.ADMIN],
    '/doctor': [USER_ROLES.DOCTOR, USER_ROLES.ADMIN],
    '/staff': [USER_ROLES.STAFF, USER_ROLES.ADMIN],
    '/patient': [USER_ROLES.PATIENT],
  };

  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return true; // Public route
  
  return hasPermission(userRole, allowedRoles);
};

export const canPerformAction = (userRole, action) => {
  const actionPermissions = {
    createUser: [USER_ROLES.ADMIN],
    deleteUser: [USER_ROLES.ADMIN],
    updateUser: [USER_ROLES.ADMIN, USER_ROLES.STAFF],
    viewUsers: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.DOCTOR],
    
    createAppointment: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.PATIENT],
    cancelAppointment: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.PATIENT, USER_ROLES.DOCTOR],
    updateAppointment: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.DOCTOR],
    
    createPrescription: [USER_ROLES.DOCTOR],
    viewPrescription: [USER_ROLES.DOCTOR, USER_ROLES.PATIENT, USER_ROLES.ADMIN],
    
    manageInventory: [USER_ROLES.ADMIN, USER_ROLES.STAFF],
    viewInventory: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.DOCTOR],
    
    manageWards: [USER_ROLES.ADMIN, USER_ROLES.STAFF],
    viewWards: [USER_ROLES.ADMIN, USER_ROLES.STAFF, USER_ROLES.DOCTOR],
  };

  const allowedRoles = actionPermissions[action];
  if (!allowedRoles) return false;
  
  return hasPermission(userRole, allowedRoles);
};

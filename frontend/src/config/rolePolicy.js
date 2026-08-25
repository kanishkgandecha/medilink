const ROLE_ALIASES = {
  administrator: 'admin',
  admin: 'admin',
  doctor: 'doctor',
  patient: 'patient',
  staff: 'staff',
  nurse: 'nurse',
  receptionist: 'receptionist',
  pharmacist: 'pharmacist',
  labtechnician: 'lab-technician',
  radiologytech: 'radiology-technician',
  radiologytechnician: 'radiology-technician',
  billing: 'billing-staff',
  billingstaff: 'billing-staff',
  wardmanager: 'ward-manager',
}

export const normalizeRoleKey = (value) => {
  const compact = String(value || '').replace(/[^a-z]/gi, '').toLowerCase()
  return ROLE_ALIASES[compact] || compact
}

export const getUserRoleKey = (user) => {
  const primary = normalizeRoleKey(user?.role)
  if (primary === 'staff' && user?.subRole) return normalizeRoleKey(user.subRole)
  return primary || 'unknown'
}

export const hasAnyRole = (user, allowedRoles = []) => {
  if (!allowedRoles?.length) return true
  const roleKey = getUserRoleKey(user)
  return allowedRoles.some((role) => normalizeRoleKey(role) === roleKey)
}

export const AUTHENTICATED_ROLE_KEYS = [
  'admin',
  'doctor',
  'patient',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab-technician',
  'radiology-technician',
  'billing-staff',
  'ward-manager',
]

export const ROUTE_ROLES = {
  doctors: ['admin', 'doctor', 'patient', 'nurse', 'receptionist'],
  patients: ['admin', 'doctor', 'patient', 'nurse', 'receptionist', 'ward-manager'],
  appointments: ['admin', 'doctor', 'patient', 'nurse', 'receptionist'],
  wards: ['admin', 'doctor', 'nurse', 'ward-manager'],
  pharmacy: ['admin', 'pharmacist'],
  prescriptions: ['admin', 'doctor', 'patient', 'nurse', 'pharmacist'],
  billing: ['admin', 'patient', 'receptionist', 'pharmacist', 'billing-staff'],
  staff: ['admin'],
  reports: ['admin'],
  testReports: ['admin', 'doctor', 'patient', 'nurse', 'lab-technician', 'radiology-technician'],
  aiAgents: AUTHENTICATED_ROLE_KEYS,
  account: AUTHENTICATED_ROLE_KEYS,
}

export const ROLE_LABELS = {
  admin: 'Admin',
  doctor: 'Doctor',
  patient: 'Patient',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  'lab-technician': 'Lab Technician',
  'radiology-technician': 'Radiology Technician',
  'billing-staff': 'Billing Staff',
  'ward-manager': 'Ward Manager',
}

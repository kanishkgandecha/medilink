// Centralized capability + copy resolution for capability-sensitive list/detail pages.
//
// Every page that shows patients, doctors, appointments, prescriptions, test
// reports, wards, pharmacy stock, staff, or billing must present a heading,
// description, and scope label that match what the signed-in role can
// actually see and do — not a generic "Management" screen shown to everyone.
//
// These functions are the single source of truth for that wording so pages
// don't scatter raw `user.role === 'X'` checks. The scope/action booleans
// below are derived from the ACTUAL backend authorization for each route
// (see the corresponding controller/route file) — they must be kept in sync
// with backend changes, but they are UX presentation only. The backend
// endpoints remain the real authorization boundary.
//
// Scope tones (rendered by ScopeBadge):
//   'self'     — the signed-in user's own record only
//   'assigned' — genuinely filtered to records tied to this user by the API
//   'all'      — full, unfiltered access to the resource (with mutate rights)
//   'view'     — full, unfiltered read access but no mutation rights

import { getUserRoleKey } from './rolePolicy'

// ── Patients (backend: patientsRoutes.js — GET /patients scopes to self for
//    Patient role only; every other allowed role receives the full list) ──
export const getPatientsCapability = (user) => {
  const role = getUserRoleKey(user)

  if (role === 'patient') {
    return {
      title: 'My Health Record',
      description: 'Your personal details and clinical record',
      scope: { label: 'My record', tone: 'self' },
      canCreate: false,
      canEdit: false,
      canDelete: false,
    }
  }

  const canManage = role === 'admin' || role === 'receptionist'
  if (canManage) {
    return {
      title: 'Patient Management',
      description: 'Manage patient records and information',
      scope: { label: 'All patients', tone: 'all' },
      canCreate: true,
      canEdit: true,
      // DELETE /patients/:id is Admin-only on the backend
      canDelete: role === 'admin',
    }
  }

  // Doctor, Nurse, Ward Manager: full read access, no create/edit/delete in this UI
  return {
    title: 'Patient Directory',
    description: 'Browse patient records to support care and scheduling',
    scope: { label: 'All patients · View only', tone: 'view' },
    canCreate: false,
    canEdit: false,
    canDelete: false,
  }
}

// ── Doctors directory (backend: doctorRoutes.js — GET /doctors is never
//    filtered by role; everyone who can reach it sees the same list) ──
export const getDoctorsCapability = (user) => {
  const role = getUserRoleKey(user)
  const canManage = role === 'admin' || role === 'receptionist'

  if (canManage) {
    return {
      title: 'Doctor Management',
      description: 'Manage doctor profiles, schedules, and availability',
      scope: { label: 'All doctors', tone: 'all' },
      canCreate: true,
      canEdit: true,
      canDelete: role === 'admin',
    }
  }

  return {
    title: 'Doctor Directory',
    description: role === 'patient'
      ? 'Browse doctors and their availability before booking'
      : 'Browse doctor profiles and availability',
    scope: { label: 'All doctors · View only', tone: 'view' },
    canCreate: false,
    canEdit: false,
    canDelete: false,
  }
}

// ── Appointments (backend: appointmentController.getAppointments scopes to
//    the signed-in Patient's own appointments, and to the signed-in Doctor's
//    own appointments; every other allowed role sees every appointment) ──
export const getAppointmentsCapability = (user) => {
  const role = getUserRoleKey(user)

  if (role === 'patient') {
    return {
      title: 'My Appointments',
      description: 'Your upcoming and past appointments',
      scope: { label: 'My appointments', tone: 'self' },
      canCreate: true,
      canManage: true,
    }
  }

  if (role === 'doctor') {
    return {
      title: 'My Appointments',
      description: 'Appointments booked with you',
      scope: { label: 'My appointments', tone: 'assigned' },
      canCreate: true,
      canManage: true,
    }
  }

  const canManage = role === 'admin' || role === 'receptionist'
  return {
    title: canManage ? 'Appointment Management' : 'Appointments',
    description: canManage ? 'Manage all patient appointments' : 'View scheduled appointments',
    scope: canManage
      ? { label: 'All appointments', tone: 'all' }
      : { label: 'All appointments · View only', tone: 'view' },
    canCreate: canManage,
    canManage,
  }
}

// ── Prescriptions (backend: prescriptionController.getPrescriptions scopes
//    to the signed-in Patient's own prescriptions and the signed-in Doctor's
//    own prescriptions; Pharmacist and other roles see every prescription) ──
export const getPrescriptionsCapability = (user) => {
  const role = getUserRoleKey(user)

  if (role === 'patient') {
    return {
      title: 'Prescriptions',
      description: 'Your prescriptions from doctors',
      scope: { label: 'My prescriptions', tone: 'self' },
    }
  }
  if (role === 'doctor') {
    return {
      title: 'Prescriptions',
      description: 'Write and track prescriptions for your patients',
      scope: { label: 'My prescriptions', tone: 'assigned' },
    }
  }
  if (role === 'pharmacist') {
    return {
      title: 'Prescriptions',
      description: 'Dispense queue drawn from every pending prescription',
      scope: { label: 'All prescriptions · Dispense queue', tone: 'all' },
    }
  }
  return {
    title: 'Prescriptions',
    description: 'View prescription records',
    scope: { label: 'All prescriptions · View only', tone: 'view' },
  }
}

// ── Test reports (backend: patientsRoutes.js — diagnostic-workspace routes
//    give Lab/Radiology Technicians a privacy-reduced, modality-filtered
//    queue; Doctor/Nurse/Admin use the full patient list with no filtering;
//    POST /:id/lab-report only allows Doctor, Nurse, Lab Tech, Radiology Tech
//    — Admin cannot add a report even though it can view every patient) ──
export const getTestReportsCapability = (user) => {
  const role = getUserRoleKey(user)

  if (role === 'patient') {
    return {
      title: 'Test Reports',
      description: 'Your lab tests and diagnostic reports',
      scope: { label: 'My reports', tone: 'self' },
      canAdd: false,
    }
  }
  if (role === 'lab-technician') {
    return {
      title: 'Test Reports',
      description: 'Create and review patient laboratory reports',
      scope: { label: 'Diagnostic queue · Lab', tone: 'assigned' },
      canAdd: true,
    }
  }
  if (role === 'radiology-technician') {
    return {
      title: 'Test Reports',
      description: 'Create and review patient imaging reports',
      scope: { label: 'Diagnostic queue · Radiology', tone: 'assigned' },
      canAdd: true,
    }
  }
  if (role === 'doctor' || role === 'nurse') {
    return {
      title: 'Test Reports',
      description: 'Create and review patient laboratory reports',
      scope: { label: 'All patients', tone: 'all' },
      canAdd: true,
    }
  }
  // Admin: full visibility, but the backend does not allow Admin to add a report
  return {
    title: 'Test Reports',
    description: 'Review patient laboratory reports',
    scope: { label: 'All patients · View only', tone: 'view' },
    canAdd: false,
  }
}

// ── Wards & beds (backend: wardRoutes.js — ward create/edit/delete is
//    Admin-only; assign/discharge a bed is allowed for Admin, Nurse,
//    Receptionist, Ward Manager, and Doctor; GET is never filtered) ──
export const getWardsCapability = (user) => {
  const role = getUserRoleKey(user)
  return {
    title: 'Ward & Bed Management',
    description: 'Monitor ward status and patient-bed assignments in real time',
    scope: { label: 'All wards', tone: 'all' },
    // Create/edit/delete a ward definition
    canManageWard: role === 'admin',
    // Assign/discharge a patient to/from a bed
    canManageBeds: ['admin', 'doctor', 'nurse', 'ward-manager', 'receptionist'].includes(role),
  }
}

// ── Pharmacy inventory (backend: medicineRoutes.js — create/edit is Admin
//    or Pharmacist; delete is Admin-only) ──
export const getPharmacyCapability = (user) => {
  const role = getUserRoleKey(user)
  return {
    title: 'Pharmacy Management',
    description: 'Track medicine stock, pricing, and expiry',
    scope: { label: 'All medicines', tone: 'all' },
    canEdit: role === 'admin' || role === 'pharmacist',
    canDelete: role === 'admin',
  }
}

// ── Staff (backend: staffRoutes.js — the entire router is Admin-only) ──
export const getStaffCapability = () => ({
  title: 'Staff Management',
  description: 'Manage staff records, shifts, and departments',
  scope: { label: 'All staff', tone: 'all' },
})

// ── Billing (backend: billingController.getBills scopes to the signed-in
//    Patient's own bills; Pharmacist is scoped to Pharmacy-type bills only;
//    every other allowed role sees every bill) ──
export const getBillingCapability = (user) => {
  const role = getUserRoleKey(user)

  if (role === 'patient') {
    return {
      title: 'My Bills & Payments',
      description: 'Your invoices and payment history',
      scope: { label: 'My bills', tone: 'self' },
    }
  }
  if (role === 'pharmacist') {
    return {
      title: 'Pharmacy Billing',
      description: 'Create and track pharmacy bills for dispensed medicines',
      scope: { label: 'Pharmacy bills', tone: 'assigned' },
    }
  }
  return {
    title: 'Billing & Payments',
    description: 'Manage invoices, payments, and outstanding balances',
    scope: { label: 'All invoices', tone: 'all' },
  }
}

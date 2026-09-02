import { describe, it, expect } from 'vitest'
import { normalizeRoleKey, getUserRoleKey, hasAnyRole, ROUTE_ROLES } from './rolePolicy'

describe('normalizeRoleKey', () => {
  it('normalizes varied casing/spacing of the same sub-role to one canonical key', () => {
    expect(normalizeRoleKey('BillingStaff')).toBe('billing-staff')
    expect(normalizeRoleKey('Billing Staff')).toBe('billing-staff')
    expect(normalizeRoleKey('billing-staff')).toBe('billing-staff')
  })
})

describe('getUserRoleKey', () => {
  it('resolves a Staff user by their subRole, not the generic "staff" role', () => {
    expect(getUserRoleKey({ role: 'Staff', subRole: 'LabTechnician' })).toBe('lab-technician')
    expect(getUserRoleKey({ role: 'Staff', subRole: 'RadiologyTechnician' })).toBe('radiology-technician')
  })

  it('resolves a non-Staff user directly from their role', () => {
    expect(getUserRoleKey({ role: 'Admin' })).toBe('admin')
    expect(getUserRoleKey({ role: 'Patient' })).toBe('patient')
  })
})

// Representative authorization boundary: the Staff page/route is Admin-only
// on the backend (staffRoutes.js: router.use(authorize('Admin')) after
// protect), so the frontend's allow-list must not include any other role —
// a regression here would let non-admin staff open a page whose every
// underlying API call is guaranteed to 403.
describe('ROUTE_ROLES.staff authorization boundary', () => {
  it('allows only Admin', () => {
    expect(ROUTE_ROLES.staff).toEqual(['admin'])
  })

  it('rejects every non-admin role via hasAnyRole', () => {
    const nonAdminUsers = [
      { role: 'Doctor' },
      { role: 'Patient' },
      { role: 'Staff', subRole: 'Nurse' },
      { role: 'Staff', subRole: 'Receptionist' },
      { role: 'Staff', subRole: 'BillingStaff' },
    ]
    for (const user of nonAdminUsers) {
      expect(hasAnyRole(user, ROUTE_ROLES.staff)).toBe(false)
    }
    expect(hasAnyRole({ role: 'Admin' }, ROUTE_ROLES.staff)).toBe(true)
  })
})

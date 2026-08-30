import { describe, it, expect } from 'vitest'
import {
  getPatientsCapability,
  getDoctorsCapability,
  getAppointmentsCapability,
  getPrescriptionsCapability,
  getTestReportsCapability,
  getWardsCapability,
  getPharmacyCapability,
  getBillingCapability,
} from './pageCapabilities'

const patient   = { role: 'Patient' }
const admin     = { role: 'Admin' }
const doctor    = { role: 'Doctor' }
const nurse     = { role: 'Staff', subRole: 'Nurse' }
const receptionist = { role: 'Staff', subRole: 'Receptionist' }
const pharmacist   = { role: 'Staff', subRole: 'Pharmacist' }
const wardManager  = { role: 'Staff', subRole: 'WardManager' }
const labTech       = { role: 'Staff', subRole: 'LabTechnician' }
const radiologyTech = { role: 'Staff', subRole: 'RadiologyTechnician' }
const billingStaff  = { role: 'Staff', subRole: 'BillingStaff' }

describe('getPatientsCapability', () => {
  it('never shows "Management" wording to a patient viewing their own data', () => {
    const cap = getPatientsCapability(patient)
    expect(cap.title.toLowerCase()).not.toContain('management')
    expect(cap.scope.label).toBe('My record')
    expect(cap.scope.tone).toBe('self')
    expect(cap.canCreate).toBe(false)
    expect(cap.canEdit).toBe(false)
    expect(cap.canDelete).toBe(false)
  })

  it('grants full manage rights to Admin, including delete', () => {
    const cap = getPatientsCapability(admin)
    expect(cap.title).toBe('Patient Management')
    expect(cap.scope.tone).toBe('all')
    expect(cap.canCreate).toBe(true)
    expect(cap.canEdit).toBe(true)
    expect(cap.canDelete).toBe(true)
  })

  it('grants Receptionist create/edit but not delete (DELETE /patients/:id is Admin-only)', () => {
    const cap = getPatientsCapability(receptionist)
    expect(cap.canCreate).toBe(true)
    expect(cap.canEdit).toBe(true)
    expect(cap.canDelete).toBe(false)
  })

  it('gives Doctor/Nurse a view-only Directory, not a claim of "assigned" patients', () => {
    // The backend returns every patient to Doctor/Nurse with no assignment
    // filter, so the copy must say so honestly instead of promising a scope
    // the API doesn't implement.
    for (const user of [doctor, nurse, wardManager]) {
      const cap = getPatientsCapability(user)
      expect(cap.title).not.toMatch(/management/i)
      expect(cap.title).toBe('Patient Directory')
      expect(cap.scope.label.toLowerCase()).not.toContain('assigned')
      expect(cap.canCreate).toBe(false)
      expect(cap.canEdit).toBe(false)
      expect(cap.canDelete).toBe(false)
    }
  })
})

describe('getDoctorsCapability', () => {
  it('uses Directory wording (not Management) for view-only roles', () => {
    const cap = getDoctorsCapability(patient)
    expect(cap.title).toBe('Doctor Directory')
    expect(cap.scope.tone).toBe('view')
  })

  it('restricts delete to Admin even when Receptionist can manage', () => {
    const adminCap = getDoctorsCapability(admin)
    const receptionCap = getDoctorsCapability(receptionist)
    expect(adminCap.canDelete).toBe(true)
    expect(receptionCap.canCreate).toBe(true)
    expect(receptionCap.canDelete).toBe(false)
  })
})

describe('getAppointmentsCapability', () => {
  it('labels a patient\'s own appointments as self-scoped', () => {
    const cap = getAppointmentsCapability(patient)
    expect(cap.title).toBe('My Appointments')
    expect(cap.scope.tone).toBe('self')
  })

  it('labels a doctor\'s appointments as assigned (backend filters by doctorId)', () => {
    const cap = getAppointmentsCapability(doctor)
    expect(cap.title).toBe('My Appointments')
    expect(cap.scope.tone).toBe('assigned')
    expect(cap.canManage).toBe(true)
  })

  it('gives Nurse a view-only "All appointments" scope, not manage rights', () => {
    const cap = getAppointmentsCapability(nurse)
    expect(cap.scope.tone).toBe('view')
    expect(cap.canManage).toBe(false)
    expect(cap.canCreate).toBe(false)
  })

  it('gives Admin/Receptionist full manage rights over all appointments', () => {
    const cap = getAppointmentsCapability(receptionist)
    expect(cap.title).toBe('Appointment Management')
    expect(cap.scope.tone).toBe('all')
    expect(cap.canManage).toBe(true)
  })
})

describe('getPrescriptionsCapability', () => {
  it('scopes patient and doctor views but treats pharmacist/others as all-records', () => {
    expect(getPrescriptionsCapability(patient).scope.tone).toBe('self')
    expect(getPrescriptionsCapability(doctor).scope.tone).toBe('assigned')
    expect(getPrescriptionsCapability(pharmacist).scope.tone).toBe('all')
    expect(getPrescriptionsCapability(nurse).scope.tone).toBe('view')
  })
})

describe('getTestReportsCapability', () => {
  it('does not allow Admin to add a report even though it can view every patient', () => {
    // POST /patients/:id/lab-report only allows Doctor, Nurse, Lab Tech, Radiology Tech.
    const cap = getTestReportsCapability(admin)
    expect(cap.canAdd).toBe(false)
    expect(cap.scope.tone).toBe('view')
  })

  it('gives lab/radiology technicians a privacy-reduced diagnostic queue label', () => {
    expect(getTestReportsCapability(labTech).scope.label).toMatch(/Diagnostic queue/)
    expect(getTestReportsCapability(radiologyTech).scope.label).toMatch(/Diagnostic queue/)
    expect(getTestReportsCapability(labTech).canAdd).toBe(true)
  })

  it('lets a patient see only their own reports', () => {
    const cap = getTestReportsCapability(patient)
    expect(cap.scope.label).toBe('My reports')
    expect(cap.canAdd).toBe(false)
  })
})

describe('getWardsCapability', () => {
  it('restricts ward create/edit/delete to Admin only', () => {
    expect(getWardsCapability(admin).canManageWard).toBe(true)
    expect(getWardsCapability(nurse).canManageWard).toBe(false)
    expect(getWardsCapability(doctor).canManageWard).toBe(false)
  })

  it('allows bed assign/discharge for Admin, Doctor, Nurse, Ward Manager, Receptionist', () => {
    for (const user of [admin, doctor, nurse, wardManager, receptionist]) {
      expect(getWardsCapability(user).canManageBeds).toBe(true)
    }
    expect(getWardsCapability(pharmacist).canManageBeds).toBe(false)
  })
})

describe('getPharmacyCapability', () => {
  it('restricts delete to Admin (DELETE /medicines/:id is Admin-only)', () => {
    expect(getPharmacyCapability(admin).canDelete).toBe(true)
    expect(getPharmacyCapability(pharmacist).canDelete).toBe(false)
    expect(getPharmacyCapability(pharmacist).canEdit).toBe(true)
  })
})

describe('getBillingCapability', () => {
  it('gives each role a distinct, capability-accurate scope label', () => {
    expect(getBillingCapability(patient).scope.label).toBe('My bills')
    expect(getBillingCapability(pharmacist).scope.label).toBe('Pharmacy bills')
    expect(getBillingCapability(billingStaff).scope.label).toBe('All invoices')
    expect(getBillingCapability(admin).scope.label).toBe('All invoices')
  })
})

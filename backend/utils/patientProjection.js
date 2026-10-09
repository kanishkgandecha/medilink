'use strict';

// Minimum-necessary Prisma `select` shapes for patient list/detail responses.
// Clinical sub-records (medical history, medications, lab reports, imaging,
// admissions) are never part of a list response; they are served only by the
// care-scoped record endpoints.

const normalize = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

const roleKeyOf = (user) => {
  const role = normalize(user?.role);
  if (role === 'staff' && user?.subRole) return normalize(user.subRole);
  return role;
};

const IDENTITY_USER = { id: true, name: true, email: true, phone: true, gender: true, dateOfBirth: true };
const ADDRESS_USER = { street: true, city: true, state: true, zipCode: true, country: true };
const BASE = { id: true, patientId: true, createdAt: true };

const REGISTRATION_SELECT = Object.freeze({
  ...BASE,
  bloodGroup: true,
  allergies: true,
  emergencyContact: true,
  insuranceInfo: true,
  user: { select: { ...IDENTITY_USER, ...ADDRESS_USER } },
});

const SELECT_BY_ROLE = Object.freeze({
  // Registration/administration: demographics and registration fields.
  admin: REGISTRATION_SELECT,
  receptionist: REGISTRATION_SELECT,
  // Clinicians see safety-relevant summary fields; detail is care-scoped.
  doctor: { ...BASE, bloodGroup: true, allergies: true, emergencyContact: true, user: { select: IDENTITY_USER } },
  // Nurses need an identity list for admissions/bed assignment; clinical detail
  // is served only for patients with an active encounter.
  nurse: { ...BASE, user: { select: IDENTITY_USER } },
  // Dispensing safety needs allergies; nothing else clinical.
  pharmacist: { ...BASE, allergies: true, user: { select: { id: true, name: true, phone: true } } },
  // Invoicing needs identity, address, and insurance — no clinical data.
  billingstaff: { ...BASE, insuranceInfo: true, user: { select: { id: true, name: true, email: true, phone: true, ...ADDRESS_USER } } },
  // Bed operations need identity, age, and gender for placement.
  wardmanager: { ...BASE, user: { select: { id: true, name: true, phone: true, gender: true, dateOfBirth: true } } },
});

const DEFAULT_SELECT = Object.freeze({ ...BASE, user: { select: { id: true, name: true } } });

const patientListSelectForUser = (user) => SELECT_BY_ROLE[roleKeyOf(user)] || DEFAULT_SELECT;

const CLINICAL_SUBRECORD_KEYS = ['medicalHistory', 'currentMedications', 'labReports', 'imagingData', 'admissionHistory'];

// Roles allowed the full clinical patient detail (after care-scope checks).
const CLINICAL_DETAIL_ROLES = new Set(['admin', 'doctor', 'nurse', 'patient']);
const canViewClinicalDetail = (user) => CLINICAL_DETAIL_ROLES.has(roleKeyOf(user));

module.exports = {
  roleKeyOf,
  patientListSelectForUser,
  canViewClinicalDetail,
  CLINICAL_SUBRECORD_KEYS,
  REGISTRATION_SELECT,
};

'use strict';

// Shared validators for list/report query filters. Without them, an invalid
// enum or date string reaches Prisma and fails as a (masked) 500 instead of a
// clear 400. Values are validated in the same forms the API accepts
// (enum names, plus the hyphenated display forms the UI sends where noted).

const { query } = require('express-validator');
const { validate } = require('./validator');
const { normalizeAppointmentStatus, normalizePrescriptionStatus, normalizeBillingStatus } = require('../utils/stateMachines');

const ENUMS = Object.freeze({
  appointmentStatus: ['Scheduled', 'Confirmed', 'In_Progress', 'Completed', 'Cancelled', 'No_Show'],
  appointmentPriority: ['Normal', 'Urgent', 'Emergency'],
  prescriptionStatus: ['Pending', 'Partially_Filled', 'Fulfilled', 'Cancelled'],
  paymentStatus: ['Unpaid', 'Partially_Paid', 'Paid', 'Refunded'],
  medicineCategory: ['Analgesic', 'Antibiotic', 'Anti_inflammatory', 'Antidiabetic', 'Antihypertensive', 'Antihistamine',
    'Cardiovascular', 'Gastrointestinal', 'Respiratory', 'Neurological', 'Dermatological', 'Other'],
  wardType: ['General', 'ICU', 'NICU', 'Private', 'Semi_Private', 'Emergency', 'Isolation'],
  wardGender: ['Male', 'Female', 'Mixed'],
  employmentType: ['Full_Time', 'Part_Time', 'Contract', 'Intern'],
  shift: ['Morning', 'Evening', 'Night', 'Rotational'],
});

const normalizeEmploymentType = (value) => ({ 'Full-Time': 'Full_Time', 'Part-Time': 'Part_Time' }[value] || value);

const enumFilter = (name, values, normalize = (v) => v) =>
  query(name).optional().custom((value) => values.includes(normalize(value))).withMessage(`Invalid ${name} filter`);
const dateFilter = (name) => query(name).optional().isISO8601().withMessage(`${name} must be an ISO 8601 date`);
const intFilter = (name, options = {}) => query(name).optional().isInt(options).withMessage(`${name} must be an integer`);

const withValidation = (...chains) => [...chains, validate];

module.exports = {
  ENUMS,
  normalizeEmploymentType,
  appointmentListQuery: withValidation(
    enumFilter('status', ENUMS.appointmentStatus, normalizeAppointmentStatus),
    enumFilter('priority', ENUMS.appointmentPriority),
    dateFilter('date'),
  ),
  prescriptionListQuery: withValidation(
    enumFilter('status', ENUMS.prescriptionStatus, normalizePrescriptionStatus),
    dateFilter('startDate'), dateFilter('endDate'),
  ),
  billingListQuery: withValidation(
    enumFilter('paymentStatus', ENUMS.paymentStatus, normalizeBillingStatus),
    dateFilter('startDate'), dateFilter('endDate'),
  ),
  dateRangeQuery: withValidation(dateFilter('startDate'), dateFilter('endDate')),
  medicineListQuery: withValidation(enumFilter('category', ENUMS.medicineCategory)),
  wardListQuery: withValidation(enumFilter('wardType', ENUMS.wardType), enumFilter('gender', ENUMS.wardGender)),
  wardUsageQuery: withValidation(enumFilter('wardType', ENUMS.wardType), intFilter('floor', { min: -5, max: 200 })),
  revenueQuery: withValidation(dateFilter('startDate'), dateFilter('endDate'),
    enumFilter('paymentStatus', ENUMS.paymentStatus, normalizeBillingStatus)),
  staffListQuery: withValidation(
    enumFilter('employmentType', ENUMS.employmentType, normalizeEmploymentType),
    enumFilter('shift', ENUMS.shift),
  ),
  expiringQuery: withValidation(intFilter('months', { min: 1, max: 60 })),
  reliabilityQuery: withValidation(intFilter('hours', { min: 1, max: 720 })),
};

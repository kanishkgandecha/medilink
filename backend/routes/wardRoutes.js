const express = require('express');
const router = express.Router();
const { auditRoute, fromParam, patientFromResource, idOf } = require('../utils/audit');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { wardListQuery } = require('../middleware/queryValidation');
const {
  createWard,
  getWards,
  getWard,
  updateWard,
  deleteWard,
} = require('../controllers/wardController');
const { assignBed, dischargeBed } = require('../controllers/wardTransactionController');

const WARD_TYPES = ['General', 'ICU', 'NICU', 'Private', 'Semi_Private', 'Emergency', 'Isolation'];
const WARD_GENDERS = ['Male', 'Female', 'Mixed'];
const wardDetailValidation = [
  body('wardType').optional().isIn(WARD_TYPES).withMessage('Invalid ward type'),
  body('gender').optional().isIn(WARD_GENDERS).withMessage('Invalid ward gender'),
  body('floor').optional({ nullable: true }).isInt({ min: -5, max: 200 }).withMessage('Floor must be an integer'),
  body('dailyRate').optional().isFloat({ min: 0, max: 10000000 }).withMessage('Daily rate must be a non-negative number'),
  body('facilities').optional().isArray({ max: 50 }).withMessage('Facilities must be a list'),
];

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Ward Manager'), wardListQuery, getWards)
  .post(authorize('Admin'), [
    body('wardNumber').notEmpty().withMessage('Ward number is required'),
    body('wardName').notEmpty().withMessage('Ward name is required'),
    body('totalBeds').isInt({ min: 1, max: 500 }).withMessage('Total beds must be between 1 and 500'),
    ...wardDetailValidation,
    validate
  ], createWard);

router.route('/:id')
  .get(authorize('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Ward Manager'), getWard)
  .put(authorize('Admin'), [body('wardName').optional().isString().trim().notEmpty(), ...wardDetailValidation, validate], updateWard)
  .delete(authorize('Admin'), deleteWard);

// Existing: auto-assigns next available bed
router.post('/:id/allocate', auditRoute('BED_ASSIGNED', { resourceType: 'Ward', resourceId: fromParam(), patientId: (req) => req.body.patientId }), authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager'), [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('admissionDate').optional().isISO8601().withMessage('Admission date is invalid'),
  body('expectedDischargeDate').optional().isISO8601().withMessage('Expected discharge date is invalid'),
  validate,
], assignBed);
// Existing: release by bedNumber string
router.post('/:id/release', auditRoute('BED_DISCHARGED', { resourceType: 'Ward', resourceId: fromParam(), metadata: (req, body) => ({ replayed: Boolean(body.replayed) }) }), authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager'), [
  body('bedNumber').notEmpty().withMessage('Bed number is required'),
  body('idempotencyKey').isUUID().withMessage('A valid idempotency key is required'),
  validate,
], dischargeBed);

// New: assign specific bed by beds._id
router.post('/:id/assign', auditRoute('BED_ASSIGNED', { resourceType: 'Ward', resourceId: fromParam(), patientId: (req) => req.body.patientId }), authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager', 'Doctor'), [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('admissionDate').optional().isISO8601().withMessage('Admission date is invalid'),
  body('expectedDischargeDate').optional().isISO8601().withMessage('Expected discharge date is invalid'),
  validate,
], assignBed);
// New: discharge from specific bed by beds._id
router.post('/:id/discharge', auditRoute('BED_DISCHARGED', { resourceType: 'Ward', resourceId: fromParam(), metadata: (req, body) => ({ replayed: Boolean(body.replayed) }) }), authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager', 'Doctor'), [
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('idempotencyKey').isUUID().withMessage('A valid idempotency key is required'),
  validate,
], dischargeBed);

module.exports = router;

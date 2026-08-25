const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createWard,
  getWards,
  getWard,
  updateWard,
  deleteWard,
} = require('../controllers/wardController');
const { assignBed, dischargeBed } = require('../controllers/wardTransactionController');

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Ward Manager'), getWards)
  .post(authorize('Admin'), [
    body('wardNumber').notEmpty().withMessage('Ward number is required'),
    body('wardName').notEmpty().withMessage('Ward name is required'),
    body('totalBeds').isInt({ min: 1 }).withMessage('Total beds must be at least 1'),
    validate
  ], createWard);

router.route('/:id')
  .get(authorize('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Ward Manager'), getWard)
  .put(authorize('Admin'), updateWard)
  .delete(authorize('Admin'), deleteWard);

// Existing: auto-assigns next available bed
router.post('/:id/allocate', authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager'), [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('admissionDate').optional().isISO8601().withMessage('Admission date is invalid'),
  body('expectedDischargeDate').optional().isISO8601().withMessage('Expected discharge date is invalid'),
  validate,
], assignBed);
// Existing: release by bedNumber string
router.post('/:id/release', authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager'), [
  body('bedNumber').notEmpty().withMessage('Bed number is required'),
  body('idempotencyKey').isUUID().withMessage('A valid idempotency key is required'),
  validate,
], dischargeBed);

// New: assign specific bed by beds._id
router.post('/:id/assign', authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager', 'Doctor'), [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('admissionDate').optional().isISO8601().withMessage('Admission date is invalid'),
  body('expectedDischargeDate').optional().isISO8601().withMessage('Expected discharge date is invalid'),
  validate,
], assignBed);
// New: discharge from specific bed by beds._id
router.post('/:id/discharge', authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager', 'Doctor'), [
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('idempotencyKey').isUUID().withMessage('A valid idempotency key is required'),
  validate,
], dischargeBed);

module.exports = router;

const express = require('express');
const router = express.Router();
const { auditRoute, fromParam, patientFromResource, idOf } = require('../utils/audit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { requirePrescriptionAccess } = require('../middleware/prescriptionAccess');
const { prescriptionListQuery } = require('../middleware/queryValidation');
const {
  createPrescription,
  getPrescriptions,
  getPrescription,
  cancelPrescription,
  refillPrescription,
  dispensePrescription
} = require('../controllers/prescriptionController');

router.use(protect);

router.route('/')
  .get(authorize('Admin', 'Doctor', 'Nurse', 'Patient', 'Pharmacist'), prescriptionListQuery, getPrescriptions)
  .post(auditRoute('PRESCRIPTION_CREATED', { resourceType: 'Prescription', resourceId: (req, body) => idOf(body.data), patientId: (req, body) => body.data && (body.data.patientId || idOf(body.data.patient)), metadata: (req) => ({ itemCount: (req.body.medicines || []).length }) }), authorize('Doctor'), [
    body('patient').notEmpty().withMessage('Patient ID is required'),
    body('medicines').isArray({ min: 1, max: 50 }).withMessage('Between 1 and 50 medicines are required'),
    body('medicines.*.medicine').notEmpty().withMessage('Medicine ID is required'),
    body('medicines.*.quantity').isInt({ min: 1, max: 10000 }).withMessage('Medicine quantity must be a positive integer'),
    body('medicines.*.dosage').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Dosage is required and must be concise'),
    body('medicines.*.frequency').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Frequency is required and must be concise'),
    body('medicines.*.duration').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Duration is required and must be concise'),
    body('refillsAllowed').optional().isInt({ min: 0, max: 12 }).withMessage('Refills allowed must be between 0 and 12'),
    body('validUntil').optional().isISO8601().withMessage('Valid-until date is invalid'),
    validate
  ], createPrescription);

router.route('/:id')
  .get(auditRoute('PRESCRIPTION_VIEWED', { resourceType: 'Prescription', resourceId: fromParam(), patientId: (req, body) => body.data && (body.data.patientId || idOf(body.data.patient)) }), requirePrescriptionAccess('Admin', 'Nurse', 'Pharmacist'), getPrescription);

router.put('/:id/cancel', auditRoute('PRESCRIPTION_CANCELLED', { resourceType: 'Prescription', resourceId: fromParam() }), authorize('Doctor', 'Admin'), requirePrescriptionAccess('Admin'), cancelPrescription);
router.post('/:id/refill', auditRoute('PRESCRIPTION_REFILLED', { resourceType: 'Prescription', resourceId: fromParam(), patientId: (req, body) => body.data && (body.data.patientId || idOf(body.data.patient)), metadata: (req, body) => ({ replayed: Boolean(body.replayed) }) }), authorize('Pharmacist'), requirePrescriptionAccess('Pharmacist'), [
  body('idempotencyKey').isUUID().withMessage('A valid idempotency key is required'),
  validate,
], refillPrescription);
router.post('/:id/dispense', auditRoute('PRESCRIPTION_DISPENSED', { resourceType: 'Prescription', resourceId: fromParam(), patientId: (req, body) => body.data && (body.data.patientId || idOf(body.data.patient)), metadata: (req, body) => ({ itemCount: (req.body.items || []).length, replayed: Boolean(body.replayed), status: body.data && body.data.status }) }), authorize('Pharmacist'), requirePrescriptionAccess('Pharmacist'), [
  body('idempotencyKey').isUUID().withMessage('A valid idempotency key is required'),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Between 1 and 50 dispense items are required'),
  body('items.*.medicineId').notEmpty().withMessage('Medicine ID is required'),
  body('items.*.dispensedQuantity').isInt({ min: 1 }).withMessage('Dispensed quantity must be a positive integer'),
  validate,
], dispensePrescription);

module.exports = router;

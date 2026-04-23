const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createBill,
  getBills,
  getBill,
  recordPayment,
  patientPayBill,
  processInsuranceClaim,
  updateInsuranceClaim,
  getBillingStats,
  deleteBill,
  getPatientUsers
} = require('../controllers/billingController');

router.use(protect);

// Patient dropdown for billing forms (Admin/Receptionist/Pharmacist)
router.get('/patient-users', authorize('Admin', 'Receptionist', 'Pharmacist'), getPatientUsers);

// Stats (Pharmacist sees pharmacy-only stats via controller-level filtering)
router.get('/stats', authorize('Admin', 'Receptionist', 'Pharmacist'), getBillingStats);

// Main billing routes
router.route('/')
  .get(authorize('Admin', 'Receptionist', 'Pharmacist', 'Patient'), getBills)
  .post(authorize('Admin', 'Receptionist', 'Pharmacist'), [
    body('patient').notEmpty().withMessage('Patient ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.description').notEmpty().withMessage('Item description is required'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
    validate
  ], createBill);

router.route('/:id')
  .get(getBill)
  .delete(authorize('Admin'), deleteBill);

// Patient self-pay (pays full outstanding balance)
router.post('/:id/pay', authorize('Patient'), [
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  validate
], patientPayBill);

// Admin/Receptionist payment recording (supports partial payments)
router.post('/:id/payment', authorize('Admin', 'Receptionist'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid payment amount is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  validate
], recordPayment);

// Insurance routes
router.post('/:id/insurance', authorize('Admin', 'Receptionist'), [
  body('claimNumber').notEmpty().withMessage('Claim number is required'),
  body('provider').notEmpty().withMessage('Provider is required'),
  body('amountClaimed').isFloat({ min: 0.01 }).withMessage('Valid amount claimed is required'),
  validate
], processInsuranceClaim);

router.put('/:id/insurance', authorize('Admin'), [
  body('status').isIn(['Pending', 'Approved', 'Rejected', 'Partially-Approved']).withMessage('Valid status is required'),
  validate
], updateInsuranceClaim);

module.exports = router;

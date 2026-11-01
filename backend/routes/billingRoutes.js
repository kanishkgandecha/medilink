const express = require('express');
const router = express.Router();
const { auditRoute, fromParam, patientFromResource, idOf } = require('../utils/audit');

const BILLING_CATEGORIES = ['Consultation', 'Medicine', 'Lab_Test', 'Imaging', 'Surgery', 'Room_Charges', 'Emergency', 'Other'];
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { requireBillAccess } = require('../middleware/billingAccess');
const { billingListQuery, dateRangeQuery } = require('../middleware/queryValidation');
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
router.get('/patient-users', authorize('Admin', 'Receptionist', 'Pharmacist', 'Billing Staff'), getPatientUsers);

// Stats (Pharmacist sees pharmacy-only stats via controller-level filtering)
router.get('/stats', authorize('Admin', 'Receptionist', 'Pharmacist', 'Billing Staff'), dateRangeQuery, getBillingStats);

// Main billing routes
router.route('/')
  .get(authorize('Admin', 'Receptionist', 'Pharmacist', 'Patient', 'Billing Staff'), billingListQuery, getBills)
  .post(auditRoute('BILL_CREATED', { resourceType: 'Billing', resourceId: (req, body) => idOf(body.bill), patientId: (req, body) => body.bill && body.bill.patientId, metadata: (req, body) => ({ billType: body.bill && body.bill.billType, totalAmount: body.bill && body.bill.totalAmount }) }), authorize('Admin', 'Receptionist', 'Pharmacist', 'Billing Staff'), [
    body('patient').notEmpty().withMessage('Patient ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.description').notEmpty().withMessage('Item description is required'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
    body('items.*.category').optional().isIn(BILLING_CATEGORIES).withMessage('Invalid item category'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a non-negative number'),
    body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be a non-negative number'),
    body('paymentMethod').optional().isIn(['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Online', 'Other', 'Cheque']).withMessage('Invalid payment method'),
    validate
  ], createBill);

router.route('/:id')
  .get(auditRoute('BILL_VIEWED', { resourceType: 'Billing', resourceId: fromParam(), patientId: (req, body) => body.data && body.data.patientId }), requireBillAccess('Admin', 'Receptionist', 'Billing Staff'), getBill)
  .delete(auditRoute('BILL_DELETED', { resourceType: 'Billing', resourceId: fromParam() }), authorize('Admin'), deleteBill);

// Patient self-pay (pays full outstanding balance)
router.post('/:id/pay', auditRoute('PATIENT_PAYMENT_RECORDED', { resourceType: 'Billing', resourceId: fromParam(), patientId: (req, body) => body.bill && body.bill.patientId, metadata: (req) => ({ paymentMethod: req.body.paymentMethod, simulated: true }) }), authorize('Patient'), requireBillAccess(), [
  body('paymentMethod').isIn(['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Online', 'Other', 'Cheque'])
    .withMessage('Valid payment method is required'),
  validate
], patientPayBill);

// Admin/Receptionist payment recording (supports partial payments)
router.post('/:id/payment', auditRoute('PAYMENT_RECORDED', { resourceType: 'Billing', resourceId: fromParam(), patientId: (req, body) => body.bill && body.bill.patientId, metadata: (req) => ({ amount: Number(req.body.amount), paymentMethod: req.body.paymentMethod }) }), authorize('Admin', 'Receptionist', 'Billing Staff'), [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid payment amount is required'),
  body('paymentMethod').isIn(['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Online', 'Other', 'Cheque'])
    .withMessage('Valid payment method is required'),
  validate
], recordPayment);

// Insurance routes
router.post('/:id/insurance', auditRoute('INSURANCE_CLAIM_SUBMITTED', { resourceType: 'Billing', resourceId: fromParam(), patientId: (req, body) => body.bill && body.bill.patientId, metadata: (req) => ({ amountClaimed: Number(req.body.amountClaimed) }) }), authorize('Admin', 'Receptionist', 'Billing Staff'), [
  body('claimNumber').notEmpty().withMessage('Claim number is required'),
  body('provider').notEmpty().withMessage('Provider is required'),
  body('amountClaimed').isFloat({ min: 0.01 }).withMessage('Valid amount claimed is required'),
  validate
], processInsuranceClaim);

router.put('/:id/insurance', auditRoute('INSURANCE_CLAIM_PROCESSED', { resourceType: 'Billing', resourceId: fromParam(), patientId: (req, body) => body.bill && body.bill.patientId, metadata: (req) => ({ claimStatus: req.body.status }) }), authorize('Admin'), [
  body('status').isIn(['Pending', 'Approved', 'Rejected', 'Partially-Approved']).withMessage('Valid status is required'),
  validate
], updateInsuranceClaim);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createPrescription,
  getPrescriptions,
  getPrescription,
  updatePrescriptionStatus,
  cancelPrescription,
  refillPrescription,
  dispensePrescription
} = require('../controllers/prescriptionController');

router.use(protect);

router.route('/')
  .get(getPrescriptions)
  .post(authorize('Doctor'), [
    body('patient').notEmpty().withMessage('Patient ID is required'),
    body('medicines').isArray({ min: 1 }).withMessage('At least one medicine is required'),
    validate
  ], createPrescription);

router.route('/:id')
  .get(getPrescription);

router.put('/:id/status', authorize('Pharmacist'), updatePrescriptionStatus);
router.put('/:id/cancel', authorize('Doctor', 'Admin'), cancelPrescription);
router.post('/:id/refill', authorize('Pharmacist'), refillPrescription);
router.post('/:id/dispense', authorize('Pharmacist'), dispensePrescription);

module.exports = router;
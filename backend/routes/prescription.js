const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Create prescription (doctor only)
router.post('/', verifyToken, authorize(['doctor']), prescriptionController.createPrescription);

// Validate prescription before creating
router.post('/validate', verifyToken, authorize(['doctor']), prescriptionController.validatePrescription);

// Get all prescriptions
router.get('/', verifyToken, prescriptionController.getAllPrescriptions);

// Get patient prescriptions
router.get('/patient/:patientId', verifyToken, prescriptionController.getPatientPrescriptions);

// Get prescription by ID
router.get('/:id', verifyToken, prescriptionController.getPrescriptionById);

// Update prescription (doctor only)
router.put('/:id', verifyToken, authorize(['doctor']), prescriptionController.updatePrescription);

// Cancel prescription
router.patch('/:id/cancel', verifyToken, authorize(['doctor']), prescriptionController.cancelPrescription);

// Delete prescription (admin only)
router.delete('/:id', verifyToken, authorize(['admin']), prescriptionController.deletePrescription);

module.exports = router;

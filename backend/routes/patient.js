const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Get all patients (doctor, staff, admin)
router.get('/', verifyToken, authorize(['doctor', 'staff', 'admin']), patientController.getAllPatients);

// Get patient by ID
router.get('/:id', verifyToken, patientController.getPatientById);

// Update patient profile
router.put('/:id', verifyToken, patientController.updatePatient);

// Get patient medical history
router.get('/:id/history', verifyToken, patientController.getPatientHistory);

// Add medical history entry
router.post('/:id/history', verifyToken, authorize(['doctor', 'admin']), patientController.addMedicalHistory);

// Update medical history entry
router.put('/:id/history/:historyId', verifyToken, authorize(['doctor', 'admin']), patientController.updateMedicalHistory);

// Get patient prescriptions
router.get('/:id/prescriptions', verifyToken, patientController.getPatientPrescriptions);

// Delete patient (admin only)
router.delete('/:id', verifyToken, authorize(['admin']), patientController.deletePatient);

module.exports = router;

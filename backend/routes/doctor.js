const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Get all doctors
router.get('/', doctorController.getAllDoctors);

// Get doctor by ID
router.get('/:id', doctorController.getDoctorById);

// Get doctor availability
router.get('/:id/availability', doctorController.getDoctorAvailability);

// Get doctor schedule
router.get('/:id/schedule', verifyToken, doctorController.getDoctorSchedule);

// Update doctor profile (doctor or admin)
router.put('/:id', verifyToken, authorize(['doctor', 'admin']), doctorController.updateDoctor);

// Update doctor availability (doctor or admin)
router.put('/:id/availability', verifyToken, authorize(['doctor', 'admin']), doctorController.updateAvailability);

// Get doctor statistics (doctor or admin)
router.get('/:id/statistics', verifyToken, authorize(['doctor', 'admin']), doctorController.getDoctorStatistics);

module.exports = router;

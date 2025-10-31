const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Create appointment
router.post('/', verifyToken, appointmentController.createAppointment);

// Get all appointments (with filters)
router.get('/', verifyToken, appointmentController.getAllAppointments);

// Get my appointments (patient view)
router.get('/my', verifyToken, authorize(['patient']), appointmentController.getMyAppointments);

// Get doctor's appointments
router.get('/doctor/:doctorId', verifyToken, appointmentController.getDoctorAppointments);

// Get optimal time slot
router.post('/optimal-slot', verifyToken, appointmentController.getOptimalSlot);

// Get appointment by ID
router.get('/:id', verifyToken, appointmentController.getAppointmentById);

// Update appointment
router.put('/:id', verifyToken, appointmentController.updateAppointment);

// Cancel appointment
router.patch('/:id/cancel', verifyToken, appointmentController.cancelAppointment);

// Complete appointment (doctor only)
router.patch('/:id/complete', verifyToken, authorize(['doctor']), appointmentController.completeAppointment);

// Delete appointment (admin only)
router.delete('/:id', verifyToken, authorize(['admin']), appointmentController.deleteAppointment);

module.exports = router;

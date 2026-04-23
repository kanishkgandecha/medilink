const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
  updateAvailability,
  addOnCallShift,
  getAvailableDoctorUsers,
  getDoctorSchedule,
  getDoctorAppointments
} = require('../controllers/doctorController');

// Protect all routes - authentication required
router.use(protect);

// Get available doctor users (must be before /:id routes)
router.get('/available-users', authorize('Admin', 'Receptionist'), getAvailableDoctorUsers);

// Main doctor routes
router.route('/')
  .get(getDoctors)
  .post(authorize('Admin', 'Receptionist'), [
    body('specialization').notEmpty().withMessage('Specialization is required'),
    body('consultationFee').optional().isNumeric().withMessage('Consultation fee must be a number'),
    body('experience').optional().isNumeric().withMessage('Experience must be a number'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().notEmpty().withMessage('Phone is required'),
    validate
  ], createDoctor);

// Single doctor routes
router.route('/:id')
  .get(getDoctor)
  .put(authorize('Admin', 'Receptionist', 'Doctor'), updateDoctor)
  .delete(authorize('Admin'), deleteDoctor);

// Doctor schedule/availability routes
router.get('/:id/schedule', getDoctorSchedule);
router.put('/:id/availability', authorize('Admin', 'Receptionist', 'Doctor'), [
  body('availability').isArray().withMessage('Availability must be an array'),
  validate
], updateAvailability);

// On-call shift management
router.post('/:id/oncall', authorize('Admin', 'Receptionist'), [
  body('date').notEmpty().withMessage('Date is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  validate
], addOnCallShift);

// Doctor appointments
router.get('/:id/appointments', getDoctorAppointments);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getDoctorAvailability
} = require('../controllers/appointmentController');

// Protect all routes - authentication required
router.use(protect);

// Get doctor availability (must be before /:id routes)
router.get('/availability/:doctorId', getDoctorAvailability);

// Main appointment routes
router.route('/')
  .get(getAppointments)
  .post(authorize('Admin', 'Receptionist', 'Doctor', 'Patient'), [
    body('patient').optional().isMongoId().withMessage('Invalid patient ID'),
    body('doctor').notEmpty().withMessage('Doctor ID is required'),
    body('appointmentDate').isISO8601().withMessage('Valid date is required'),
    body('timeSlot.startTime').notEmpty().withMessage('Start time is required'),
    body('timeSlot.endTime').notEmpty().withMessage('End time is required'),
    body('type').isIn(['Consultation', 'Follow-up', 'Emergency', 'Surgery'])
      .withMessage('Invalid appointment type'),
    body('priority').optional().isIn(['Normal', 'Urgent', 'Emergency'])
      .withMessage('Invalid priority level'),
    validate
  ], createAppointment);

// Single appointment routes
router.route('/:id')
  .get(getAppointment)
  .put(authorize('Admin', 'Doctor', 'Receptionist'), [
    body('timeSlot.startTime').optional(),
    body('timeSlot.endTime').optional(),
    body('status').optional().isIn([
      'Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'
    ]).withMessage('Invalid status'),
    validate
  ], updateAppointment);

// Cancel appointment
router.put('/:id/cancel', authorize('Admin', 'Doctor', 'Receptionist', 'Patient'), [
  body('reason').optional().isString().withMessage('Cancel reason must be a string'),
  validate
], cancelAppointment);

// Reschedule appointment
router.put('/:id/reschedule', authorize('Admin', 'Doctor', 'Receptionist'), [
  body('appointmentDate').isISO8601().withMessage('Valid date is required'),
  body('timeSlot.startTime').notEmpty().withMessage('Start time is required'),
  body('timeSlot.endTime').notEmpty().withMessage('End time is required'),
  validate
], rescheduleAppointment);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { requireAppointmentAccess } = require('../middleware/appointmentAccess');
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
    body('patient').custom((value, { req }) => {
      if (req.user.role === 'Patient' && !value) return true;
      if (!value) throw new Error('Patient ID is required');
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      const isLegacyMongoId = /^[0-9a-f]{24}$/i.test(value);
      if (!isUuid && !isLegacyMongoId) throw new Error('Invalid patient ID');
      return true;
    }),
    body('doctor').notEmpty().withMessage('Doctor ID is required'),
    body('appointmentDate').isISO8601({ strict: true }).withMessage('Valid date is required'),
    body('timeSlot.startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Valid start time is required'),
    body('timeSlot.endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Valid end time is required')
      .custom((endTime, { req }) => {
        if (req.body.timeSlot?.startTime && endTime <= req.body.timeSlot.startTime) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    body('type').isIn(['Consultation', 'Follow-up', 'Emergency', 'Surgery'])
      .withMessage('Invalid appointment type'),
    body('priority').optional().isIn(['Normal', 'Urgent', 'Emergency'])
      .withMessage('Invalid priority level'),
    body('bookingKey').optional().isString().trim().isLength({ min: 8, max: 100 }).withMessage('Invalid booking key'),
    body('symptoms').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    validate
  ], createAppointment);

// Single appointment routes
router.route('/:id')
  .get(requireAppointmentAccess('Admin', 'Nurse', 'Receptionist'), getAppointment)
  .put(authorize('Admin', 'Doctor', 'Receptionist'), requireAppointmentAccess('Admin', 'Receptionist'), [
    body('timeSlot.startTime').optional(),
    body('timeSlot.endTime').optional(),
    body('status').optional().isIn([
      'Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'
    ]).withMessage('Invalid status'),
    validate
  ], updateAppointment);

// Cancel appointment
router.put('/:id/cancel', authorize('Admin', 'Doctor', 'Receptionist', 'Patient'), requireAppointmentAccess('Admin', 'Receptionist'), [
  body('reason').optional().isString().withMessage('Cancel reason must be a string'),
  validate
], cancelAppointment);

// Reschedule appointment
router.put('/:id/reschedule', authorize('Admin', 'Doctor', 'Receptionist'), requireAppointmentAccess('Admin', 'Receptionist'), [
  body('appointmentDate').isISO8601({ strict: true }).withMessage('Valid date is required'),
  body('timeSlot.startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Valid start time is required'),
  body('timeSlot.endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Valid end time is required')
    .custom((endTime, { req }) => {
      if (req.body.timeSlot?.startTime && endTime <= req.body.timeSlot.startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  validate
], rescheduleAppointment);

module.exports = router;

const express = require('express');
const router = express.Router();
const { auditRoute, fromParam, patientFromResource, idOf } = require('../utils/audit');
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { requireDoctorAccess } = require('../middleware/doctorAccess');
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
  .post(auditRoute('DOCTOR_CREATED', { resourceType: 'Doctor', resourceId: (req, body) => idOf(body.data) }), authorize('Admin', 'Receptionist'), [
    body('specialization').notEmpty().withMessage('Specialization is required'),
    body('consultationFee').optional().isNumeric().withMessage('Consultation fee must be a number'),
    body('experience').optional().isNumeric().withMessage('Experience must be a number'),
    body('experience').optional().isInt({ min: 0, max: 80 }).withMessage('Experience must be between 0 and 80 years'),
    body('consultationFee').optional().isFloat({ min: 0, max: 1000000 }).withMessage('Consultation fee is invalid'),
    body('licenseNumber').optional().trim().isLength({ min: 3, max: 100 }).withMessage('License number is invalid'),
    body('qualification').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Qualification is invalid'),
    body('availability').optional().isArray({ max: 7 }).withMessage('Availability must contain at most seven day schedules'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().notEmpty().withMessage('Phone is required'),
    validate
  ], createDoctor);

// Single doctor routes
router.route('/:id')
  .get(getDoctor)
  .put(auditRoute('DOCTOR_UPDATED', { resourceType: 'Doctor', resourceId: fromParam(), metadata: (req) => ({ fields: Object.keys(req.body || {}) }) }), authorize('Admin', 'Receptionist', 'Doctor'), requireDoctorAccess('Admin', 'Receptionist'), [
    body('experience').optional().isInt({ min: 0, max: 80 }),
    body('consultationFee').optional().isFloat({ min: 0, max: 1000000 }),
    body('licenseNumber').optional().trim().isLength({ min: 3, max: 100 }),
    body('availability').optional().isArray({ max: 7 }),
    body('isAvailable').optional().isBoolean(),
    validate,
  ], updateDoctor)
  .delete(auditRoute('DOCTOR_DEACTIVATED', { resourceType: 'Doctor', resourceId: fromParam() }), authorize('Admin'), deleteDoctor);

// Doctor schedule/availability routes
router.get('/:id/schedule', getDoctorSchedule);
router.put('/:id/availability', auditRoute('DOCTOR_AVAILABILITY_UPDATED', { resourceType: 'Doctor', resourceId: fromParam() }), authorize('Admin', 'Receptionist', 'Doctor'), requireDoctorAccess('Admin', 'Receptionist'), [
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
router.get('/:id/appointments', requireDoctorAccess('Admin', 'Receptionist', 'Nurse'), getDoctorAppointments);

module.exports = router;

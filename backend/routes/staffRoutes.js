const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createStaff,
  getStaff,
  getAvailableStaffUsers,
  getStaffMember,
  updateStaff,
  deleteStaff,
  updatePerformance,
  getStaffByDepartment,
  getStaffStats
} = require('../controllers/staffController');

router.use(protect);
router.use(authorize('Admin'));

router.get('/available-users', getAvailableStaffUsers);
router.get('/stats', getStaffStats);
router.get('/department/:department', getStaffByDepartment);

router.route('/')
  .get(getStaff)
  .post([
    body('department').notEmpty().withMessage('Department is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().notEmpty().withMessage('Phone is required'),
    body('subRole').isIn(['Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Ward Manager']).withMessage('Valid sub-role is required'),
    body('employmentType').optional().isIn(['Full-Time', 'Part-Time', 'Full_Time', 'Part_Time', 'Contract', 'Intern']),
    body('shift').optional().isIn(['Morning', 'Evening', 'Night', 'Rotational']),
    body('joiningDate').optional().isISO8601().toDate(),
    body('salary.basic').optional().isFloat({ min: 0, max: 100000000 }),
    body('salary.allowances').optional().isFloat({ min: 0, max: 100000000 }),
    validate
  ], createStaff);

router.route('/:id')
  .get(getStaffMember)
  .put([
    body('employmentType').optional().isIn(['Full-Time', 'Part-Time', 'Full_Time', 'Part_Time', 'Contract', 'Intern']),
    body('shift').optional().isIn(['Morning', 'Evening', 'Night', 'Rotational']),
    body('joiningDate').optional().isISO8601().toDate(),
    body('salary.basic').optional().isFloat({ min: 0, max: 100000000 }),
    body('salary.allowances').optional().isFloat({ min: 0, max: 100000000 }),
    validate,
  ], updateStaff)
  .delete(deleteStaff);

router.put('/:id/performance', [
  body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  validate
], updatePerformance);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const {
  createWard,
  getWards,
  getWard,
  updateWard,
  deleteWard,
  allocateBed,
  releaseBed
} = require('../controllers/wardController');

router.use(protect);

router.route('/')
  .get(getWards)
  .post(authorize('Admin'), [
    body('wardNumber').notEmpty().withMessage('Ward number is required'),
    body('wardName').notEmpty().withMessage('Ward name is required'),
    body('totalBeds').isInt({ min: 1 }).withMessage('Total beds must be at least 1'),
    validate
  ], createWard);

router.route('/:id')
  .get(getWard)
  .put(authorize('Admin'), updateWard)
  .delete(authorize('Admin'), deleteWard);

router.post('/:id/allocate', authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager'), allocateBed);
router.post('/:id/release', authorize('Admin', 'Nurse', 'Receptionist', 'Ward Manager'), releaseBed);

module.exports = router;
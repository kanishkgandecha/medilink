const express = require('express');
const router = express.Router();

const MEDICINE_CATEGORIES = ['Analgesic', 'Antibiotic', 'Anti_inflammatory', 'Antidiabetic', 'Antihypertensive', 'Antihistamine',
  'Cardiovascular', 'Gastrointestinal', 'Respiratory', 'Neurological', 'Dermatological', 'Other'];
const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Other'];
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { medicineListQuery, expiringQuery } = require('../middleware/queryValidation');
const {
  createMedicine,
  getMedicines,
  getMedicine,
  updateMedicine,
  deleteMedicine,
  updateStock,
  getLowStockAlert,
  getExpiringMedicines,
  getExpiredMedicines,
  getMedicineCategories,
  getMedicineStats
} = require('../controllers/medicineController');

router.use(protect);

// Stats and alerts routes (must be before /:id)
router.get('/stats', authorize('Admin', 'Pharmacist', 'Doctor'), getMedicineStats);
router.get('/categories', getMedicineCategories);
router.get('/alerts/low-stock', authorize('Admin', 'Pharmacist'), getLowStockAlert);
router.get('/alerts/expiring', authorize('Admin', 'Pharmacist'), expiringQuery, getExpiringMedicines);
router.get('/alerts/expired', authorize('Admin', 'Pharmacist'), getExpiredMedicines);

// Main medicine routes
router.route('/')
  .get(medicineListQuery, getMedicines)
  .post(authorize('Admin', 'Pharmacist'), [
    body('name').notEmpty().withMessage('Medicine name is required'),
    body('genericName').notEmpty().withMessage('Generic name is required'),
    body('manufacturer').notEmpty().withMessage('Manufacturer is required'),
    body('category').isIn(MEDICINE_CATEGORIES).withMessage('Valid category is required'),
    body('dosageForm').optional().isIn(DOSAGE_FORMS).withMessage('Invalid dosage form'),
    body('unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
    body('reorderLevel').isInt({ min: 0 }).withMessage('Valid reorder level is required'),
    body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
    validate
  ], createMedicine);

router.route('/:id')
  .get(getMedicine)
  .put(authorize('Admin', 'Pharmacist'), [
    body('name').optional().isString().trim().notEmpty(),
    body('category').optional().isIn(MEDICINE_CATEGORIES).withMessage('Invalid category'),
    body('dosageForm').optional().isIn(DOSAGE_FORMS).withMessage('Invalid dosage form'),
    body('unitPrice').optional().isFloat({ min: 0 }).withMessage('Unit price must be a non-negative number'),
    body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
    body('reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be a non-negative integer'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    validate,
  ], updateMedicine)
  .delete(authorize('Admin'), deleteMedicine);

// Stock management
router.put('/:id/stock', authorize('Admin', 'Pharmacist'), [
  body('quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('operation').isIn(['add', 'reduce', 'set']).withMessage('Valid operation is required'),
  validate
], updateStock);

module.exports = router;
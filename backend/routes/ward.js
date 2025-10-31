const express = require('express');
const router = express.Router();
const wardController = require('../controllers/wardController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Get all wards
router.get('/', verifyToken, wardController.getAllWards);

// Get available wards
router.get('/available', verifyToken, wardController.getAvailableWards);

// AI-based patient allocation
router.post('/allocate', verifyToken, authorize(['doctor', 'staff', 'admin']), wardController.allocatePatient);

// Get transfer suggestions
router.get('/transfer-suggestions', verifyToken, authorize(['admin']), wardController.getTransferSuggestions);

// Get ward by ID
router.get('/:id', verifyToken, wardController.getWardById);

// Create ward (admin only)
router.post('/', verifyToken, authorize(['admin']), wardController.createWard);

// Update ward (admin, staff)
router.put('/:id', verifyToken, authorize(['admin', 'staff']), wardController.updateWard);

// Assign patient to ward
router.post('/:id/assign', verifyToken, authorize(['doctor', 'staff', 'admin']), wardController.assignPatientToWard);

// Remove patient from ward
router.post('/:id/remove', verifyToken, authorize(['doctor', 'staff', 'admin']), wardController.removePatientFromWard);

// Delete ward (admin only)
router.delete('/:id', verifyToken, authorize(['admin']), wardController.deleteWard);

module.exports = router;

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Admin only - get all users
router.get('/', verifyToken, authorize(['admin']), userController.getAllUsers);

// Get current user profile
router.get('/profile', verifyToken, userController.getProfile);

// Update current user profile
router.put('/profile', verifyToken, userController.updateProfile);

// Admin only - get user by ID
router.get('/:id', verifyToken, authorize(['admin']), userController.getUserById);

// Admin only - update user
router.put('/:id', verifyToken, authorize(['admin']), userController.updateUser);

// Admin only - delete user
router.delete('/:id', verifyToken, authorize(['admin']), userController.deleteUser);

// Admin only - update user role
router.patch('/:id/role', verifyToken, authorize(['admin']), userController.updateUserRole);

// Admin only - suspend/activate user
router.patch('/:id/status', verifyToken, authorize(['admin']), userController.updateUserStatus);

module.exports = router;

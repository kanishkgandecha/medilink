const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Logout (requires authentication)
router.post('/logout', authenticate, authController.logout);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Two-Factor Authentication
router.post('/2fa/enable', authenticate, authController.enableTwoFactor);
router.post('/2fa/verify', authenticate, authController.verifyTwoFactor);
router.post('/2fa/disable', authenticate, authController.disableTwoFactor);

// Current user profile routes
router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);

// Change password (for authenticated users)
router.put('/change-password', authenticate, authController.changePassword);

// ============================================
// ADMIN ONLY ROUTES
// ============================================

// Get all users (Admin only)
router.get('/', authenticate, authorize('admin'), userController.getAllUsers);

// Get specific user by ID (Admin only)
router.get('/:id', authenticate, authorize('admin'), userController.getUserById);

// Update user (Admin only)
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

// Update user role (Admin only)
router.patch('/:id/role', authenticate, authorize('admin'), userController.updateUserRole);

// Update user status (Admin only)
router.patch('/:id/status', authenticate, authorize('admin'), userController.updateUserStatus);

module.exports = router;
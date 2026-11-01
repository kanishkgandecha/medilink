const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect } = require('../middleware/auth');
const { uploadAvatar, validateAvatarSignature } = require('../middleware/upload');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyToken,
  getMe,
  updatePassword,
  logout,
  updateProfile,
  getMyProfile,
  uploadAvatarImage,
  getAvatar,
} = require('../controllers/authController');

// Registration with validation
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  // Same strength rule as password reset and change.
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  validate
], register);

// Login with validation
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

// Password reset routes
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  validate
], forgotPassword);
router.post('/reset-password/:resettoken', [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  validate
], resetPassword);

// Protected routes (require authentication)
router.get('/verify', protect, verifyToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/my-profile', protect, getMyProfile);
router.put('/update-password', protect, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('New password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('New password must contain a number'),
  validate
], updatePassword);
router.put('/profile', protect, [
  body('name').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('phone').optional().isString().trim().isLength({ min: 1, max: 30 }).withMessage('Phone is invalid'),
  body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('address').optional().isObject().withMessage('Address must be an object'),
  // Cleared, a colour-preset key used by the Profile page (e.g. "blue"), or a
  // server-issued avatar path. Arbitrary external URLs are not accepted.
  body('avatar').optional().custom((value) => value === ''
    || /^[a-z]{3,12}$/.test(value)
    || /^\/uploads\/avatars\/[\w.-]+$/.test(value)).withMessage('Avatar must be a preset key or an uploaded avatar path'),
  validate,
], updateProfile);
router.get('/avatar', protect, getAvatar);
router.post('/avatar', protect, (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, validateAvatarSignature, uploadAvatarImage);

module.exports = router;

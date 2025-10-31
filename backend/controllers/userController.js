const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { logAudit } = require('../middleware/auth');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    let query = {};
    
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshTokens -twoFactorSecret')
      .populate('profileRef')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -refreshTokens -twoFactorSecret')
      .populate('profileRef');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
};

// Update current user profile
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'phoneNumber'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -twoFactorSecret');

    await logAudit(req, req.user.userId, 'update', 'user', 'success', { updates });

    res.json({
      success: true,
      message: 'Profile updated successfully',
       user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshTokens -twoFactorSecret')
      .populate('profileRef');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
       user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, phoneNumber, status },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens -twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await logAudit(req, req.user.userId, 'update', 'user', 'success', {
      targetUserId: req.params.id,
    });

    res.json({
      success: true,
      message: 'User updated successfully',
       user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete associated profile
    if (user.profileRef) {
      if (user.role === 'doctor') {
        await Doctor.findByIdAndDelete(user.profileRef);
      } else if (user.role === 'patient') {
        await Patient.findByIdAndDelete(user.profileRef);
      }
    }

    await user.deleteOne();

    await logAudit(req, req.user.userId, 'delete', 'user', 'success', {
      deletedUserId: req.params.id,
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'doctor', 'staff', 'patient'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -refreshTokens -twoFactorSecret');

    await logAudit(req, req.user.userId, 'role_change', 'user', 'success', {
      targetUserId: req.params.id,
      newRole: role,
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
       user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message,
    });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password -refreshTokens -twoFactorSecret');

    await logAudit(req, req.user.userId, 'update', 'user', 'success', {
      targetUserId: req.params.id,
      newStatus: status,
    });

    res.json({
      success: true,
      message: 'User status updated successfully',
       user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message,
    });
  }
};

module.exports = exports;

const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const sendEmail = require('../utils/email');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { matchPassword, hashPassword, generateToken, getResetPasswordToken } = require('../utils/userHelpers');

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, dateOfBirth, gender, address } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, password, and phone are required',
      });
    }

    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const hashedPassword = await hashPassword(password);

    let street = address?.street || null;
    let city = address?.city || null;
    let state = address?.state || null;
    let zipCode = address?.zipCode || null;
    let country = address?.country || null;

    const patientId = `PT${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'Patient',
          phone,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          street,
          city,
          state,
          zipCode,
          country,
        },
      });

      await tx.patient.create({ data: { userId: createdUser.id, patientId } });
      return createdUser;
    });

    const token = generateToken(user);

    const userResponse = {
      id: user.id,
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: { street, city, state, zipCode, country },
      isActive: user.isActive,
    };

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token,
    });
  } catch (err) {
    logger.error('Registration error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user || !(await matchPassword(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
          country: user.country,
        },
      },
    });
  } catch (err) {
    logger.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const forgotPassword = async (req, res) => {
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email, password reset instructions will be sent.',
  };

  try {
    const user = await prisma.user.findFirst({
      where: { email: req.body.email.toLowerCase() },
    });

    if (!user) return res.status(200).json(genericResponse);

    const { rawToken, resetPasswordToken, resetPasswordExpire } = getResetPasswordToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpire,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
    const message = `You requested a password reset. Please use this link to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - MediCare HMS',
        message,
      });

      return res.status(200).json(genericResponse);
    } catch (emailErr) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: null,
          resetPasswordExpire: null,
        },
      });

      logger.error('Password reset email delivery failed:', emailErr.message);
      return res.status(200).json(genericResponse);
    }
  } catch (err) {
    logger.error('Forgot password error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpire: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const hashedPassword = await hashPassword(req.body.password);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpire: null,
      },
    });

    const token = generateToken(updatedUser);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token,
    });
  } catch (err) {
    console.error('❌ Reset password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const verifyToken = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: req.user.id }, { legacyMongoId: req.user.id }] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
          country: user.country,
        },
      },
    });
  } catch (err) {
    console.error('❌ Verify token error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: req.user.id }, { legacyMongoId: req.user.id }] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { password, ...userWithoutPassword } = user;
    res.status(200).json({
      success: true,
      data: {
        ...userWithoutPassword,
        _id: user.id,
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
          country: user.country,
        },
      },
    });
  } catch (err) {
    console.error('❌ Get me error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updatePassword = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: req.user.id }, { legacyMongoId: req.user.id }] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!(await matchPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const hashedPassword = await hashPassword(req.body.newPassword);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    const token = generateToken(updatedUser);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token,
    });
  } catch (err) {
    console.error('❌ Update password error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender, address, avatar } = req.body;
    const data = {};
    if (name) data.name = name;
    if (phone) data.phone = phone;
    if (dateOfBirth) data.dateOfBirth = new Date(dateOfBirth);
    if (gender) data.gender = gender;
    if (avatar !== undefined) data.avatar = avatar;
    if (address !== undefined) {
      data.street = address.street || null;
      data.city = address.city || null;
      data.state = address.state || null;
      data.zipCode = address.zipCode || null;
      data.country = address.country || null;
    }

    const targetUser = await prisma.user.findFirst({
      where: { OR: [{ id: req.user.id }, { legacyMongoId: req.user.id }] },
    });

    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const user = await prisma.user.update({
      where: { id: targetUser.id },
      data,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        avatar: user.avatar,
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
          country: user.country,
        },
      },
    });
  } catch (err) {
    logger.error('Update profile error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ id: req.user.id }, { legacyMongoId: req.user.id }] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let roleProfile = null;
    if (user.role === 'Doctor') {
      roleProfile = await prisma.doctor.findFirst({ where: { userId: user.id } });
    } else if (user.role === 'Patient') {
      roleProfile = await prisma.patient.findFirst({
        where: { userId: user.id },
        include: {
          medicalHistory: { where: { isVoided: false } },
          currentMedications: true,
          labReports: true,
          imagingData: true,
          admissionHistory: true,
        },
      });
    } else if (['Staff', 'Nurse', 'Receptionist', 'Pharmacist'].includes(user.role)) {
      roleProfile = await prisma.staff.findFirst({ where: { userId: user.id } });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: {
          street: user.street,
          city: user.city,
          state: user.state,
          zipCode: user.zipCode,
          country: user.country,
        },
        avatar: user.avatar,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      roleProfile: roleProfile ? { ...roleProfile, _id: roleProfile.id } : null,
    });
  } catch (err) {
    logger.error('Get my profile error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const uploadAvatarImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const targetUser = await prisma.user.findFirst({
      where: { OR: [{ id: req.user.id }, { legacyMongoId: req.user.id }] },
    });

    if (targetUser) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { avatar: avatarUrl },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl,
    });
  } catch (err) {
    logger.error('Avatar upload error:', err.message);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyToken,
  getMe,
  updatePassword,
  updateProfile,
  getMyProfile,
  uploadAvatarImage,
};

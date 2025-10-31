const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  logAudit 
} = require('../middleware/auth');
const { sendEmail } = require('../utils/emailService');

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phoneNumber, ...roleData } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      role: role || 'patient',
      firstName,
      lastName,
      phoneNumber,
      status: 'active'
    });

    // Create role-specific profile
    let profileRef = null;
    
    if (role === 'doctor') {
      const doctor = await Doctor.create({
        userId: user._id,
        ...roleData
      });
      profileRef = doctor._id;
    } else if (role === 'patient') {
      const patient = await Patient.create({
        userId: user._id,
        ...roleData
      });
      profileRef = patient._id;
    }

    // Update user with profile reference
    if (profileRef) {
      user.profileRef = profileRef;
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await user.save();

    await logAudit(req, user._id, 'create', 'user', 'success', { role: user.role });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Registration error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(423).json({ 
        message: 'Account temporarily locked due to multiple failed login attempts' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      await logAudit(req, user._id, 'login', 'auth', 'failure');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({ 
          message: '2FA required',
          requires2FA: true 
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });

      if (!verified) {
        return res.status(401).json({ message: 'Invalid 2FA code' });
      }
    }

    // Reset failed attempts
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await user.save();

    await logAudit(req, user._id, 'login', 'auth', 'success');

    // Set httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    // Check if refresh token exists in database
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    
    if (!tokenExists) {
      return res.status(403).json({ message: 'Refresh token not found' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user._id, user.role);

    res.json({ accessToken });

  } catch (error) {
    res.status(500).json({ message: 'Token refresh error', error: error.message });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    
    if (refreshToken) {
      const user = await User.findById(req.user.userId);
      
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
        await user.save();
      }
    }

    await logAudit(req, req.user.userId, 'logout', 'auth', 'success');

    res.clearCookie('refreshToken');
    res.json({ message: 'Logout successful' });

  } catch (error) {
    res.status(500).json({ message: 'Logout error', error: error.message });
  }
};

// Enable 2FA
exports.enable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    const secret = speakeasy.generateSecret({
      name: `Hospital Management (${user.email})`
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      message: '2FA setup initiated',
      qrCode: qrCodeUrl,
      secret: secret.base32
    });

  } catch (error) {
    res.status(500).json({ message: '2FA setup error', error: error.message });
  }
};

// Verify and activate 2FA
exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    await logAudit(req, user._id, 'update', 'user', 'success', { action: '2FA enabled' });

    res.json({ message: '2FA enabled successfully' });

  } catch (error) {
    res.status(500).json({ message: '2FA verification error', error: error.message });
  }
};

// Request password reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ message: 'If email exists, reset link will be sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Reset your password: ${resetUrl}`
    });

    res.json({ message: 'If email exists, reset link will be sent' });

  } catch (error) {
    res.status(500).json({ message: 'Password reset error', error: error.message });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await logAudit(req, user._id, 'password_change', 'user', 'success');

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    res.status(500).json({ message: 'Password reset error', error: error.message });
  }
// Disable 2FA
exports.disable2FA = async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
  
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      await user.save();
  
      await logAudit(req, user._id, 'update', 'user', 'success', { action: '2FA disabled' });
  
      res.json({ 
        success: true,
        message: '2FA disabled successfully' 
      });
  
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: '2FA disable error', 
        error: error.message 
      });
    }
  };
  
  // Change password
  exports.changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
  
      const user = await User.findById(req.user.userId).select('+password');
  
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
  
      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }
  
      // Update password
      user.password = newPassword;
      await user.save();
  
      await logAudit(req, user._id, 'password_change', 'user', 'success');
  
      res.json({
        success: true,
        message: 'Password changed successfully',
      });
  
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Password change error',
        error: error.message,
      });
    }
  };
  };


module.exports = exports;

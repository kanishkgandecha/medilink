const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'staff', 'patient'],
    default: 'patient',
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  profileRef: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'role'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockedUntil: Date,
  lastLogin: Date,
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
  }],
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = function() {
  this.failedLoginAttempts += 1;
  
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
  }
  
  return this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = undefined;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);

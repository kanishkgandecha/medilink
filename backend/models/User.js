const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email']
  },
  password: { 
    type: String, 
    required: true, 
    minlength: 6, 
    select: false 
  },
  role: {
    type: String,
    enum: ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient', 'Pharmacist', 'Staff'],
    default: 'Patient'
  },
  subRole: {
    type: String,
    enum: ['Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Ward Manager'],
  },
  phone: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  dateOfBirth: Date,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  isActive: { type: Boolean, default: true },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(pw) {
  return await bcrypt.compare(pw, this.password);
};

userSchema.methods.generateToken = function() {
  const payload = { id: this._id, role: this.role };
  if (this.subRole) payload.subRole = this.subRole;
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

userSchema.methods.getResetPasswordToken = function() {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return token;
};

module.exports = mongoose.model('User', userSchema);
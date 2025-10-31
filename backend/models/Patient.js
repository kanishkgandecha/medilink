const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic']
    },
    notes: String
  }],
  allergies: [String],
  currentMedications: [{
    medicationName: String,
    dosage: String,
    frequency: String,
    startDate: Date
  }],
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    expiryDate: Date
  },
  assignedWard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ward'
  },
  iotDeviceId: String
}, {
  timestamps: true
});

// Calculate age
patientSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
});

module.exports = mongoose.model('Patient', patientSchema);

const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
  wardNumber: {
    type: String,
    required: true,
    unique: true
  },
  wardType: {
    type: String,
    enum: ['general', 'private', 'ICU', 'pediatric', 'maternity', 'isolation'],
    required: true
  },
  floor: Number,
  building: String,
  totalBeds: {
    type: Number,
    required: true
  },
  availableBeds: {
    type: Number,
    required: true
  },
  occupiedBeds: {
    type: Number,
    default: 0
  },
  genderPreference: {
    type: String,
    enum: ['male', 'female', 'mixed'],
    default: 'mixed'
  },
  specialization: String,
  assignedStaff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  patients: [{
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient'
    },
    bedNumber: String,
    admissionDate: Date,
    expectedDischargeDate: Date
  }],
  facilities: [String],
  status: {
    type: String,
    enum: ['active', 'maintenance', 'closed'],
    default: 'active'
  },
  aiCompatibilityScore: Number
}, {
  timestamps: true
});

// Update bed counts
wardSchema.pre('save', function(next) {
  this.occupiedBeds = this.patients.length;
  this.availableBeds = this.totalBeds - this.occupiedBeds;
  next();
});

module.exports = mongoose.model('Ward', wardSchema);

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  patientId: { 
    type: String, 
    unique: true, 
    required: true 
  },
  bloodGroup: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] 
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  medicalHistory: [{
    condition: { type: String, required: true },
    diagnosedDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['Active', 'Resolved', 'Chronic'],
      required: true
    },
    notes: String,
    addedAt: { type: Date, default: Date.now }
  }],
  allergies: [String],
  currentMedications: [{
    medicine: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: String
  }],
  labReports: [{
    testName: { type: String, required: true },
    testType: String,
    lab: String,
    testDate: Date,
    reportDate: Date,
    results: String,
    result: String,
    referenceRange: String,
    status: { type: String, default: 'Pending' },
    notes: String,
    fileUrl: String,
    normalRange: String,
    remarks: String,
    addedAt: { type: Date, default: Date.now }
  }],
  imagingData: [{
    type: String,
    date: Date,
    findings: String,
    fileUrl: String
  }],
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    validUntil: Date,
    coverageAmount: Number
  },
  admissionHistory: [{
    admissionDate: Date,
    dischargeDate: Date,
    reason: String,
    ward: String,
    attendingDoctor: String
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update timestamp on save
patientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better query performance
patientSchema.index({ userId: 1 });
patientSchema.index({ patientId: 1 });
patientSchema.index({ bloodGroup: 1 });

module.exports = mongoose.model('Patient', patientSchema);
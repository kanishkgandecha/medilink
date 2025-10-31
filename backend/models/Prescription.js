const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  medications: [{
    medicationName: {
      type: String,
      required: true
    },
    dosage: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    instructions: String,
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory'
    }
  }],
  diagnosis: {
    type: String,
    required: true
  },
  labTests: [{
    testName: String,
    notes: String,
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    }
  }],
  aiDrugInteractionWarnings: [{
    severity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'severe']
    },
    description: String,
    affectedMedications: [String]
  }],
  notes: String,
  validUntil: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Prescription', prescriptionSchema);

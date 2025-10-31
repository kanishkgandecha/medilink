const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
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
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  type: {
    type: String,
    enum: ['consultation', 'follow-up', 'surgery', 'emergency'],
    default: 'consultation'
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  reason: {
    type: String,
    required: true
  },
  symptoms: [String],
  diagnosis: String,
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  notes: String,
  aiPredictedDuration: Number, // In minutes
  aiPriority: {
    type: Number,
    min: 1,
    max: 5
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  cancelReason: String
}, {
  timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);

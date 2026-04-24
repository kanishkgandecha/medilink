const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: { 
    type: String, 
    unique: true 
  },
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: [true, 'Patient is required']
  },
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Doctor', 
    required: [true, 'Doctor is required']
  },
  appointmentDate: { 
    type: Date, 
    required: [true, 'Appointment date is required']
  },
  timeSlot: {
    startTime: { 
      type: String, 
      required: [true, 'Start time is required']
    },
    endTime: { 
      type: String, 
      required: [true, 'End time is required']
    }
  },
  type: { 
    type: String, 
    enum: {
      values: ['Consultation', 'Follow-up', 'Emergency', 'Surgery'],
      message: '{VALUE} is not a valid appointment type'
    },
    required: [true, 'Appointment type is required']
  },
  status: {
    type: String,
    enum: {
      values: ['Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'],
      message: '{VALUE} is not a valid status'
    },
    default: 'Scheduled'
  },
  priority: {
    type: String,
    enum: {
      values: ['Normal', 'Urgent', 'Emergency'],
      message: '{VALUE} is not a valid priority level'
    },
    default: 'Normal'
  },
  symptoms: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    trim: true
  },
  prescription: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Prescription' 
  },
  notes: {
    type: String,
    trim: true
  },
  operationTheatre: {
    theatreNumber: String,
    equipment: [String]
  },
  cancelReason: {
    type: String,
    trim: true
  },
  consultationFee: {
    type: Number,
    min: 0
  },
  paid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'Insurance', 'UPI', 'Other']
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});

// Generate unique appointment ID before saving
appointmentSchema.pre('save', async function(next) {
  if (!this.appointmentId) {
    const ts   = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).substr(2, 5).toUpperCase()
    this.appointmentId = `APT-${ts}-${rand}`
  }
  next();
});

// Index for faster queries
appointmentSchema.index({ doctor: 1, appointmentDate: 1, 'timeSlot.startTime': 1 });
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1 });

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function() {
  return this.appointmentDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted time
appointmentSchema.virtual('formattedTime').get(function() {
  return `${this.timeSlot.startTime} - ${this.timeSlot.endTime}`;
});

// Ensure virtuals are included in JSON
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
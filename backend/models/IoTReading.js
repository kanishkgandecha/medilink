const mongoose = require('mongoose');

const iotReadingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  readingType: {
    type: String,
    enum: ['heartRate', 'bloodPressure', 'temperature', 'oxygenLevel', 'respiratoryRate'],
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  unit: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  isAbnormal: {
    type: Boolean,
    default: false
  },
  alertSent: {
    type: Boolean,
    default: false
  },
  normalRange: {
    min: Number,
    max: Number
  },
  notes: String
}, {
  timestamps: true
});

// Check if reading is abnormal
iotReadingSchema.pre('save', function(next) {
  if (this.normalRange) {
    const val = typeof this.value === 'object' ? this.value.systolic : this.value;
    this.isAbnormal = val < this.normalRange.min || val > this.normalRange.max;
  }
  next();
});

// Index for time-series queries
iotReadingSchema.index({ patientId: 1, timestamp: -1 });
iotReadingSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('IoTReading', iotReadingSchema);

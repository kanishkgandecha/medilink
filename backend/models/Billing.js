const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    unique: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  billDate: {
    type: Date,
    default: Date.now
  },
  billType: {
    type: String,
    enum: ['Consultation', 'Pharmacy', 'Test', 'Other'],
    default: 'Other'
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['Consultation', 'Medicine', 'Lab Test', 'Imaging', 'Surgery', 'Room Charges', 'Emergency', 'Other'],
      default: 'Other'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partially-Paid', 'Paid', 'Refunded'],
    default: 'Unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Online', 'Cheque']
  },
  payments: [{
    amount: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      required: true
    },
    transactionId: String,
    notes: String,
    paymentDate: {
      type: Date,
      default: Date.now
    }
  }],
  insuranceClaim: {
    claimNumber: String,
    provider: String,
    amountClaimed: Number,
    approvedAmount: Number,
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Partially-Approved']
    },
    submittedDate: Date,
    processedDate: Date,
    rejectionReason: String
  },
  // Who created this bill and in what role capacity
  createdByRole: {
    type: String,
    enum: ['Admin', 'Receptionist', 'Pharmacist', 'Doctor']
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Optional link to the appointment this bill relates to
  relatedAppointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  notes: String
}, { timestamps: true });

billingSchema.pre('save', async function(next) {
  if (this.isNew && !this.billNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments();
    this.billNumber = `BILL-${year}${month}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

billingSchema.index({ billNumber: 1 });
billingSchema.index({ patient: 1 });
billingSchema.index({ billDate: -1 });
billingSchema.index({ paymentStatus: 1 });
billingSchema.index({ billType: 1 });

module.exports = mongoose.model('Billing', billingSchema);

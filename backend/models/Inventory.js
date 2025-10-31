const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['medicine', 'equipment', 'supplies', 'surgical'],
    required: true
  },
  genericName: String,
  manufacturer: String,
  batchNumber: String,
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true
  },
  reorderLevel: {
    type: Number,
    required: true
  },
  expiryDate: Date,
  location: {
    building: String,
    room: String,
    shelf: String
  },
  status: {
    type: String,
    enum: ['available', 'low-stock', 'out-of-stock', 'expired'],
    default: 'available'
  },
  lastRestocked: Date,
  usageHistory: [{
    date: Date,
    quantity: Number,
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    purpose: String
  }]
}, {
  timestamps: true
});

// Update status based on quantity
inventorySchema.pre('save', function(next) {
  if (this.quantity <= 0) {
    this.status = 'out-of-stock';
  } else if (this.quantity <= this.reorderLevel) {
    this.status = 'low-stock';
  } else if (this.expiryDate && this.expiryDate < Date.now()) {
    this.status = 'expired';
  } else {
    this.status = 'available';
  }
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);

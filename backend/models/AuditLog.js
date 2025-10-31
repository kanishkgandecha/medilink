const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['create', 'read', 'update', 'delete', 'login', 'logout', 
           'access_denied', 'password_change', 'role_change']
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failure'],
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Index for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

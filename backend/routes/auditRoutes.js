const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { auditRoute } = require('../utils/audit');
const { getAuditEvents } = require('../controllers/auditController');

router.use(protect);

// Reading the audit trail is itself audited.
router.get('/', auditRoute('AUDIT_LOG_VIEWED', { resourceType: 'AuditEvent', metadata: (req, body) => ({ resultCount: body.count }) }),
  authorize('Admin'), [
    query('action').optional().isString().isLength({ max: 64 }).matches(/^[A-Z_]+$/).withMessage('Invalid action filter'),
    query(['actorId', 'patientId', 'resourceId']).optional().isString().isLength({ max: 64 }).withMessage('Invalid identifier filter'),
    query('resourceType').optional().isString().isLength({ max: 40 }).matches(/^[A-Za-z]+$/).withMessage('Invalid resourceType filter'),
    query('outcome').optional().isIn(['success', 'denied', 'failure']).withMessage('Invalid outcome filter'),
    query(['from', 'to']).optional().isISO8601().withMessage('from/to must be ISO 8601 dates'),
    validate,
  ], getAuditEvents);

module.exports = router;

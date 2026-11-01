const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');

// Admin audit trail query. Newest first; filters are exact matches except the
// time window. Responses contain identifiers, outcomes, and allow-listed
// metadata only (see utils/audit.js) — no clinical content.
exports.getAuditEvents = asyncHandler(async (req, res) => {
  const { action, actorId, patientId, resourceType, resourceId, outcome, from, to } = req.query;
  const where = {};
  if (action) where.action = action;
  if (actorId) where.actorId = actorId;
  if (patientId) where.patientId = patientId;
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (outcome) where.outcome = outcome;
  if (from || to) where.createdAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) };

  const { page, limit: take, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where, orderBy: { createdAt: 'desc' }, take, skip,
      include: { actor: { select: { id: true, name: true, role: true, subRole: true } } },
    }),
    prisma.auditEvent.count({ where }),
  ]);

  res.status(200).json({ success: true, count: events.length, total, page, pages: Math.ceil(total / take), data: events });
});

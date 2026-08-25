const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

const requirePatientAccess = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  const patientId = req.params.patientId || req.params.id;
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { legacyMongoId: patientId }] },
    select: { id: true, userId: true },
  });

  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }

  const userRole = normalizeRole(req.user.role);
  const userSubRole = normalizeRole(req.user.subRole);
  const allowed = allowedRoles.map(normalizeRole);
  const ownsRecord = userRole === 'patient' && patient.userId === req.user.id;
  const hasStaffAccess = allowed.includes(userRole) || allowed.includes(userSubRole);

  if (!ownsRecord && !hasStaffAccess) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this patient' });
  }

  req.patientResource = patient;
  next();
});

module.exports = { requirePatientAccess };

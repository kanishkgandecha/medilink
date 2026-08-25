const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

const requirePrescriptionAccess = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  const prescription = await prisma.prescription.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    select: {
      id: true,
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

  const role = normalizeRole(req.user.role);
  const subRole = normalizeRole(req.user.subRole);
  const allowed = allowedRoles.map(normalizeRole);
  const ownsPrescription =
    (role === 'patient' && prescription.patient.userId === req.user.id) ||
    (role === 'doctor' && prescription.doctor.userId === req.user.id);

  if (!ownsPrescription && !allowed.includes(role) && !allowed.includes(subRole)) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this prescription' });
  }

  req.prescriptionResource = prescription;
  next();
});

module.exports = { requirePrescriptionAccess };

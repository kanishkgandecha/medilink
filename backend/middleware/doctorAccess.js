const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

const requireDoctorAccess = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    select: { id: true, userId: true },
  });

  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

  const role = normalizeRole(req.user.role);
  const subRole = normalizeRole(req.user.subRole);
  const allowed = allowedRoles.map(normalizeRole);
  const ownsProfile = role === 'doctor' && doctor.userId === req.user.id;

  if (!ownsProfile && !allowed.includes(role) && !allowed.includes(subRole)) {
    return res.status(403).json({ success: false, message: 'Not authorized to modify this doctor' });
  }

  req.doctorResource = doctor;
  next();
});

module.exports = { requireDoctorAccess };

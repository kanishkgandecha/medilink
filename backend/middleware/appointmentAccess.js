const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

const requireAppointmentAccess = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  const appointment = await prisma.appointment.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    select: {
      id: true,
      patient: { select: { userId: true } },
      doctor: { select: { userId: true } },
    },
  });

  if (!appointment) {
    return res.status(404).json({ success: false, message: 'Appointment not found' });
  }

  const role = normalizeRole(req.user.role);
  const subRole = normalizeRole(req.user.subRole);
  const allowed = allowedRoles.map(normalizeRole);
  const ownsAppointment =
    (role === 'patient' && appointment.patient.userId === req.user.id) ||
    (role === 'doctor' && appointment.doctor.userId === req.user.id);

  if (!ownsAppointment && !allowed.includes(role) && !allowed.includes(subRole)) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this appointment' });
  }

  req.appointmentResource = appointment;
  next();
});

module.exports = { requireAppointmentAccess };

const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

const requireBillAccess = (...allowedRoles) => asyncHandler(async (req, res, next) => {
  const bill = await prisma.billing.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    select: {
      id: true,
      billType: true,
      patient: { select: { userId: true } },
    },
  });

  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  const role = normalizeRole(req.user.role);
  const subRole = normalizeRole(req.user.subRole);
  const allowed = allowedRoles.map(normalizeRole);
  const ownsBill = role === 'patient' && bill.patient.userId === req.user.id;
  const pharmacistAccess = (role === 'pharmacist' || subRole === 'pharmacist') && bill.billType === 'Pharmacy';

  if (!ownsBill && !pharmacistAccess && !allowed.includes(role) && !allowed.includes(subRole)) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this bill' });
  }

  req.billResource = bill;
  next();
});

module.exports = { requireBillAccess };

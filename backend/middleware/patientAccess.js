const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { hasCareScopeAccess } = require('../utils/careScope');

const normalizeRole = (value) => String(value || '').replace(/[^a-z]/gi, '').toLowerCase();

// requirePatientAccess(...roles[, options])
//
// options.allowOwner (default true): whether the patient who owns the record
//   may pass. Clinical write routes and unreviewed clinical drafts pass
//   `{ allowOwner: false }`, so listing only staff roles really means staff only.
// options.careScope (default true): doctors and nurses must additionally be in
//   a care relationship with the patient (see utils/careScope.js).
const requirePatientAccess = (...args) => {
  const options = typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null
    ? args.pop()
    : {};
  const { allowOwner = true, careScope = true } = options;
  const allowed = args.map(normalizeRole);

  return asyncHandler(async (req, res, next) => {
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
    const ownsRecord = userRole === 'patient' && patient.userId === req.user.id;
    const hasStaffRole = userRole !== 'patient' && (allowed.includes(userRole) || allowed.includes(userSubRole));

    let permitted = false;
    if (ownsRecord) {
      permitted = allowOwner;
    } else if (hasStaffRole) {
      permitted = careScope ? await hasCareScopeAccess(req.user, patient.id) : true;
    }

    if (!permitted) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this patient' });
    }

    req.patientResource = patient;
    next();
  });
};

module.exports = { requirePatientAccess };

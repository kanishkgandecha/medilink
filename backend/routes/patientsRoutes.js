const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { requirePatientAccess } = require('../middleware/patientAccess');
const prisma = require('../config/prisma');
const {
  createPatient,
  getPatients,
  getPatient,
  getAvailablePatientUsers,
  updatePatient,
  deletePatient,
  addMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
  addLabReport,
  getPatientMedicalRecords,
  getPatientAppointments,
  getPatientStats,
} = require('../controllers/patientController');

router.use(protect);

// Get available patient users (users with role "Patient" without profile)
router.get('/available-users', authorize('Admin', 'Receptionist'), getAvailablePatientUsers);

// Heal orphaned patient users — create missing profiles (Admin only)
router.post('/heal-orphans', authorize('Admin'), async (req, res) => {
  try {
    const patientUsers = await prisma.user.findMany({
      where: { role: 'Patient', isActive: true },
      select: { id: true },
    });
    const existing = await prisma.patient.findMany({ select: { userId: true } });
    const profiledIds = new Set(existing.map((p) => p.userId));
    const orphans = patientUsers.filter((u) => !profiledIds.has(u.id));

    const created = [];
    for (const u of orphans) {
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const patientId = `PT${ts}${rand}`;
      await prisma.patient.create({ data: { userId: u.id, patientId } });
      created.push(u.id);
    }
    res.json({ success: true, message: `Fixed ${created.length} orphaned patient(s)`, count: created.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Patient search autocomplete (lightweight)
router.get('/search', authorize('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Lab Technician'), async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q.trim()) return res.json({ success: true, data: [] });

    const matchedUsers = await prisma.user.findMany({
      where: {
        role: 'Patient',
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 20,
    });

    const userIds = matchedUsers.map((u) => u.id);
    const patients = await prisma.patient.findMany({
      where: {
        archivedAt: null,
        OR: [
          { userId: { in: userIds } },
          { patientId: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, gender: true, dateOfBirth: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formatted = patients.map((p) => ({
      ...p,
      _id: p.id,
      userId: p.user ? { ...p.user, _id: p.user.id } : null,
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// Main patient routes
router
  .route('/')
  .get(
    authorize(
      'Admin',
      'Doctor',
      'Nurse',
      'Receptionist',
      'Patient',
      'Lab Technician',
      'Ward Manager',
      'Pharmacist'
    ),
    getPatients
  )
  .post(
    authorize('Admin', 'Receptionist'),
    [
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('phone').optional().notEmpty().withMessage('Phone is required'),
      validate,
    ],
    createPatient
  );

router
  .route('/:id')
  .get(requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Lab Technician', 'Ward Manager', 'Pharmacist'), getPatient)
  .put(requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Receptionist'), updatePatient)
  .delete(authorize('Admin'), deletePatient);

// Medical records
router.get('/:id/medical-records', requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Lab Technician'), getPatientMedicalRecords);

// Appointments
router.get('/:id/appointments', requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Receptionist'), getPatientAppointments);

// Stats
router.get('/:id/stats', requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Receptionist'), getPatientStats);

// Medical history routes
const medicalHistoryValidation = [
  body('condition').trim().isLength({ min: 2, max: 200 }),
  body('diagnosedDate').isISO8601().toDate(),
  body('status').isIn(['Active', 'Resolved', 'Chronic']),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }),
  validate,
];
router.post('/:id/medical-history', requirePatientAccess('Doctor', 'Nurse'), medicalHistoryValidation, addMedicalHistory);
router.put('/:id/medical-history/:historyId', requirePatientAccess('Doctor', 'Nurse'), [
  body('condition').optional().trim().isLength({ min: 2, max: 200 }),
  body('diagnosedDate').optional().isISO8601().toDate(),
  body('status').optional().isIn(['Active', 'Resolved', 'Chronic']),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }),
  body('reason').optional().trim().isLength({ max: 500 }),
  validate,
], updateMedicalHistory);
router.delete('/:id/medical-history/:historyId', requirePatientAccess('Doctor', 'Nurse'), [
  body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('A void reason is required'),
  validate,
], deleteMedicalHistory);

// Lab reports
router.post('/:id/lab-report', requirePatientAccess('Doctor', 'Nurse', 'Lab Technician'), [
  body('testName').trim().isLength({ min: 2, max: 200 }),
  body('testDate').optional({ nullable: true }).isISO8601().toDate(),
  body('reportDate').optional({ nullable: true }).isISO8601().toDate(),
  body('status').optional().isIn(['Pending', 'Collected', 'Processing', 'Completed', 'Verified', 'Amended', 'Cancelled']),
  body('result').optional({ nullable: true }).isLength({ max: 5000 }),
  body('results').optional({ nullable: true }).isLength({ max: 5000 }),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }),
  body('remarks').optional({ nullable: true }).isLength({ max: 2000 }),
  validate,
], addLabReport);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
const { requirePatientAccess } = require('../middleware/patientAccess');
const { uploadReportAttachment, validateReportAttachmentSignature } = require('../middleware/upload');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { logSafeError } = require('../utils/redact');
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
  uploadLabReportAttachment,
  downloadLabReportAttachment,
  getPatientMedicalRecords,
  getPatientAppointments,
  getPatientStats,
  getDiagnosticWorkspace,
  getDiagnosticRecords,
} = require('../controllers/patientController');
const {
  listClinicalNotes, createClinicalDraft, reviewClinicalNote, amendClinicalNote,
} = require('../controllers/clinicalNoteController');

router.use(protect);

// Get available patient users (users with role "Patient" without profile)
router.get('/available-users', authorize('Admin', 'Receptionist'), getAvailablePatientUsers);

// Privacy-reduced diagnostic queues for laboratory and radiology staff.
router.get('/diagnostic-workspace', authorize('Lab Technician', 'Radiology Technician'), getDiagnosticWorkspace);
router.get('/diagnostic-workspace/:id', authorize('Lab Technician', 'Radiology Technician'), getDiagnosticRecords);

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
    logSafeError(logger, 'heal_orphans_failed', err, { requestId: req.id });
    res.status(500).json({ success: false, message: 'Unable to repair orphaned patient profiles' });
  }
});

// Patient search autocomplete (lightweight)
router.get('/search', authorize('Admin', 'Doctor', 'Nurse', 'Receptionist'), async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    if (!q) return res.json({ success: true, data: [] });

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
      // Identity fields only: search supports booking/registration lookups and
      // must not return clinical, insurance, or emergency-contact data.
      select: {
        id: true,
        patientId: true,
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
    logSafeError(logger, 'patient_search_failed', err, { requestId: req.id });
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
      'Ward Manager',
      'Pharmacist',
      'BillingStaff'
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
  .get(requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Ward Manager', 'Pharmacist'), getPatient)
  .put(requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Receptionist'), updatePatient)
  .delete(authorize('Admin'), deletePatient);

// Medical records
router.get('/:id/medical-records', requirePatientAccess('Admin', 'Doctor', 'Nurse'), getPatientMedicalRecords);

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
// Clinical writes are staff-only: `allowOwner: false` stops the record owner
// (a patient) from authoring, editing, or voiding their own clinical record.
const CLINICAL_WRITE = { allowOwner: false };
router.post('/:id/medical-history', requirePatientAccess('Doctor', 'Nurse', CLINICAL_WRITE), medicalHistoryValidation, addMedicalHistory);
router.put('/:id/medical-history/:historyId', requirePatientAccess('Doctor', 'Nurse', CLINICAL_WRITE), [
  body('condition').optional().trim().isLength({ min: 2, max: 200 }),
  body('diagnosedDate').optional().isISO8601().toDate(),
  body('status').optional().isIn(['Active', 'Resolved', 'Chronic']),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }),
  body('reason').optional().trim().isLength({ max: 500 }),
  validate,
], updateMedicalHistory);
router.delete('/:id/medical-history/:historyId', requirePatientAccess('Doctor', 'Nurse', CLINICAL_WRITE), [
  body('reason').trim().isLength({ min: 3, max: 500 }).withMessage('A void reason is required'),
  validate,
], deleteMedicalHistory);

// Lab reports
router.post('/:id/lab-report', requirePatientAccess('Doctor', 'Nurse', 'Lab Technician', 'Radiology Technician', CLINICAL_WRITE), [
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

// Report file attachments: stored privately (never a public static URL),
// generated storage names, PDF/JPEG/PNG only, size/extension/MIME/signature
// validated. Same uploader roles as report creation; diagnostic staff are
// further scoped to their own modality inside the controller.
router.post(
  '/:id/lab-report/:reportId/attachment',
  requirePatientAccess('Doctor', 'Nurse', 'Lab Technician', 'Radiology Technician', CLINICAL_WRITE),
  (req, res, next) => {
    uploadReportAttachment(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  validateReportAttachmentSignature,
  uploadLabReportAttachment
);
router.get(
  '/:id/lab-report/:reportId/attachment',
  requirePatientAccess('Admin', 'Doctor', 'Nurse', 'Lab Technician', 'Radiology Technician'),
  downloadLabReportAttachment
);

// Generated/record-derived content remains a separate unverified draft until a doctor confirms it.
// Clinical notes include unreviewed AI/record-derived drafts, so they are not
// patient-facing until a separate reviewed-note view is designed.
router.get('/:id/clinical-notes', requirePatientAccess('Admin', 'Doctor', 'Nurse', CLINICAL_WRITE), listClinicalNotes);
router.post('/:id/clinical-notes/drafts', requirePatientAccess('Doctor', 'Nurse', CLINICAL_WRITE), [
  body('title').isString().trim().isLength({ min: 3, max: 200 }),
  body('content').isString().trim().isLength({ min: 10, max: 12000 }),
  body('source').isIn(['ai', 'record-derived']),
  body('sourceAgent').optional().isString().trim().isLength({ max: 100 }),
  validate,
], createClinicalDraft);
router.post('/:id/clinical-notes/:noteId/review', authorize('Doctor'), requirePatientAccess('Doctor', CLINICAL_WRITE), [
  body('confirmed').custom((value) => value === true).withMessage('Explicit clinician confirmation is required'),
  body('content').isString().trim().isLength({ min: 10, max: 12000 }),
  body('amendmentNote').optional().isString().trim().isLength({ max: 500 }),
  validate,
], reviewClinicalNote);
router.post('/:id/clinical-notes/:noteId/amend', authorize('Doctor'), requirePatientAccess('Doctor', CLINICAL_WRITE), [
  body('confirmed').custom((value) => value === true).withMessage('Explicit clinician confirmation is required'),
  body('content').isString().trim().isLength({ min: 10, max: 12000 }),
  body('amendmentNote').isString().trim().isLength({ min: 3, max: 500 }),
  validate,
], amendClinicalNote);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const { protect, authorize } = require('../middleware/auth');
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
  getPatientStats
} = require('../controllers/patientController');

router.use(protect);

// Get available patient users (users with role "Patient" without profile)
router.get('/available-users', authorize('Admin', 'Receptionist'), getAvailablePatientUsers);

// Heal orphaned patient users — create missing profiles (Admin only)
router.post('/heal-orphans', authorize('Admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const Patient = require('../models/Patient');
    const patientUsers = await User.find({ role: 'Patient' }).select('_id');
    const existing = await Patient.find().select('userId');
    const profiledIds = new Set(existing.map(p => p.userId.toString()));
    const orphans = patientUsers.filter(u => !profiledIds.has(u._id.toString()));
    const created = [];
    for (const u of orphans) {
      const ts = Date.now().toString().slice(-6);
      const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const patientId = `PT${ts}${rand}`;
      await Patient.create({ userId: u._id, patientId });
      created.push(u._id);
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
    const User = require('../models/User');
    const Patient = require('../models/Patient');
    const matchedUsers = await User.find({
      role: 'Patient',
      $or: [
        { name: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') }
      ]
    }).select('_id').limit(20);
    const userIds = matchedUsers.map(u => u._id);
    const patients = await Patient.find({
      $or: [
        { userId: { $in: userIds } },
        { patientId: new RegExp(q, 'i') }
      ]
    })
      .populate('userId', 'name email phone gender dateOfBirth')
      .limit(10)
      .sort({ createdAt: -1 });
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// Main patient routes
router.route('/')
  .get(authorize('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient', 'Lab Technician', 'Ward Manager', 'Pharmacist'), getPatients)
  .post(authorize('Admin', 'Receptionist'), [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().notEmpty().withMessage('Phone is required'),
    validate
  ], createPatient);

router.route('/:id')
  .get(getPatient)
  .put(authorize('Admin', 'Doctor', 'Nurse', 'Receptionist'), updatePatient)
  .delete(authorize('Admin'), deletePatient);

// Medical records
router.get('/:id/medical-records', getPatientMedicalRecords);

// Appointments
router.get('/:id/appointments', getPatientAppointments);

// Stats
router.get('/:id/stats', getPatientStats);

// Medical history routes
router.post('/:id/medical-history', authorize('Doctor', 'Nurse'), addMedicalHistory);
router.put('/:id/medical-history/:historyId', authorize('Doctor', 'Nurse'), updateMedicalHistory);
router.delete('/:id/medical-history/:historyId', authorize('Doctor', 'Nurse'), deleteMedicalHistory);

// Lab reports
router.post('/:id/lab-report', authorize('Doctor', 'Nurse', 'Lab Technician'), addLabReport);

module.exports = router;
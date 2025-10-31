const Patient = require('../models/Patient');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const { logAudit } = require('../middleware/auth');

// Get all patients
exports.getAllPatients = async (req, res) => {
  try {
    const { search, gender, bloodGroup } = req.query;

    let query = {};
    if (gender) query.gender = gender;
    if (bloodGroup) query.bloodGroup = bloodGroup;

    const patients = await Patient.find(query)
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('assignedWard')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filteredPatients = patients;
    if (search) {
      filteredPatients = patients.filter((patient) => {
        const fullName = `${patient.userId.firstName} ${patient.userId.lastName}`.toLowerCase();
        return (
          fullName.includes(search.toLowerCase()) ||
          patient.userId.email.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    res.json({
      success: true,
      count: filteredPatients.length,
      patients: filteredPatients,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: error.message,
    });
  }
};

// Get patient by ID
exports.getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('userId', 'firstName lastName email phoneNumber status')
      .populate('assignedWard');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Check authorization
    if (req.user.role === 'patient' && patient.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching patient',
      error: error.message,
    });
  }
};

// Update patient
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Check authorization
    if (req.user.role === 'patient' && patient.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const allowedUpdates = ['address', 'emergencyContact', 'allergies', 'bloodGroup'];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    const updatedPatient = await Patient.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('userId');

    await logAudit(req, req.user.userId, 'update', 'patient', 'success', {
      patientId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Patient updated successfully',
      patient: updatedPatient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating patient',
      error: error.message,
    });
  }
};

// Get patient medical history
exports.getPatientHistory = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id).select(
      'medicalHistory currentMedications allergies'
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    res.json({
      success: true,
      medicalHistory: patient.medicalHistory,
      currentMedications: patient.currentMedications,
      allergies: patient.allergies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching patient history',
      error: error.message,
    });
  }
};

// Add medical history entry
exports.addMedicalHistory = async (req, res) => {
  try {
    const { condition, diagnosedDate, status, notes } = req.body;

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    patient.medicalHistory.push({
      condition,
      diagnosedDate,
      status,
      notes,
    });

    await patient.save();

    await logAudit(req, req.user.userId, 'update', 'patient', 'success', {
      patientId: req.params.id,
      action: 'add_medical_history',
    });

    res.json({
      success: true,
      message: 'Medical history added successfully',
      medicalHistory: patient.medicalHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding medical history',
      error: error.message,
    });
  }
};

// Update medical history entry
exports.updateMedicalHistory = async (req, res) => {
  try {
    const { historyId } = req.params;
    const { condition, diagnosedDate, status, notes } = req.body;

    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const historyEntry = patient.medicalHistory.id(historyId);

    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Medical history entry not found',
      });
    }

    if (condition) historyEntry.condition = condition;
    if (diagnosedDate) historyEntry.diagnosedDate = diagnosedDate;
    if (status) historyEntry.status = status;
    if (notes) historyEntry.notes = notes;

    await patient.save();

    res.json({
      success: true,
      message: 'Medical history updated successfully',
      medicalHistory: patient.medicalHistory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating medical history',
      error: error.message,
    });
  }
};

// Get patient prescriptions
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.id })
      .populate('doctorId', 'userId specialization')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: prescriptions.length,
      prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching prescriptions',
      error: error.message,
    });
  }
};

// Delete patient
exports.deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Delete associated user
    await User.findByIdAndDelete(patient.userId);
    await patient.deleteOne();

    await logAudit(req, req.user.userId, 'delete', 'patient', 'success', {
      patientId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Patient deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting patient',
      error: error.message,
    });
  }
};

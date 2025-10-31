const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const DrugInteractionChecker = require('../services/drugInteraction');
const { logAudit } = require('../middleware/auth');

// Create prescription
exports.createPrescription = async (req, res) => {
  try {
    const { patientId, medications, diagnosis, labTests, notes, validUntil } = req.body;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Validate prescription and check for drug interactions
    const warnings = await DrugInteractionChecker.validatePrescription(
      { medications },
      patient
    );

    const prescription = await Prescription.create({
      patientId,
      doctorId: req.user.profileRef,
      medications,
      diagnosis,
      labTests,
      notes,
      validUntil,
      aiDrugInteractionWarnings: [
        ...warnings.interactions,
        ...warnings.allergies,
        ...warnings.dosage,
        ...warnings.availability,
      ],
    });

    await prescription.populate(['patientId', 'doctorId']);

    await logAudit(req, req.user.userId, 'create', 'prescription', 'success', {
      prescriptionId: prescription._id,
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
       prescription,
      warnings: warnings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating prescription',
      error: error.message,
    });
  }
};

// Validate prescription
exports.validatePrescription = async (req, res) => {
  try {
    const { patientId, medications } = req.body;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const warnings = await DrugInteractionChecker.validatePrescription(
      { medications },
      patient
    );

    res.json({
      success: true,
      warnings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating prescription',
      error: error.message,
    });
  }
};

// Get all prescriptions
exports.getAllPrescriptions = async (req, res) => {
  try {
    const { patientId, doctorId, status } = req.query;
    
    let query = {};
    
    if (patientId) query.patientId = patientId;
    if (doctorId) query.doctorId = doctorId;
    if (status) query.status = status;

    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'userId dateOfBirth gender')
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

// Get patient prescriptions
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.patientId })
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
      message: 'Error fetching patient prescriptions',
      error: error.message,
    });
  }
};

// Get prescription by ID
exports.getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId')
      .populate('appointmentId');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    res.json({
      success: true,
       prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching prescription',
      error: error.message,
    });
  }
};

// Update prescription
exports.updatePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['patientId', 'doctorId']);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    await logAudit(req, req.user.userId, 'update', 'prescription', 'success', {
      prescriptionId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Prescription updated successfully',
       prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating prescription',
      error: error.message,
    });
  }
};

// Cancel prescription
exports.cancelPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    res.json({
      success: true,
      message: 'Prescription cancelled successfully',
       prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling prescription',
      error: error.message,
    });
  }
};

// Delete prescription
exports.deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndDelete(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    await logAudit(req, req.user.userId, 'delete', 'prescription', 'success', {
      prescriptionId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Prescription deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting prescription',
      error: error.message,
    });
  }
};

module.exports = exports;

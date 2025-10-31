const Ward = require('../models/Ward');
const Patient = require('../models/Patient');
const WardAllocation = require('../services/wardAllocation');
const { logAudit } = require('../middleware/auth');

// Get all wards
exports.getAllWards = async (req, res) => {
  try {
    const { wardType, status, floor } = req.query;
    
    let query = {};
    
    if (wardType) query.wardType = wardType;
    if (status) query.status = status;
    if (floor) query.floor = parseInt(floor);

    const wards = await Ward.find(query)
      .populate('patients.patientId', 'userId dateOfBirth gender')
      .populate('assignedStaff', 'firstName lastName role')
      .sort({ wardNumber: 1 });

    res.json({
      success: true,
      count: wards.length,
       wards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching wards',
      error: error.message,
    });
  }
};

// Get available wards
exports.getAvailableWards = async (req, res) => {
  try {
    const wards = await Ward.find({
      status: 'active',
      availableBeds: { $gt: 0 },
    }).sort({ availableBeds: -1 });

    res.json({
      success: true,
      count: wards.length,
       wards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching available wards',
      error: error.message,
    });
  }
};

// AI-based patient allocation
exports.allocatePatient = async (req, res) => {
  try {
    const { patientId } = req.body;

    const allocation = await WardAllocation.allocateWard(patientId);

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: 'No suitable ward available',
      });
    }

    await logAudit(req, req.user.userId, 'create', 'ward_allocation', 'success', {
      patientId,
      wardId: allocation.ward._id,
    });

    res.json({
      success: true,
      message: 'Patient allocated successfully',
       allocation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error allocating patient',
      error: error.message,
    });
  }
};

// Get transfer suggestions
exports.getTransferSuggestions = async (req, res) => {
  try {
    const suggestions = await WardAllocation.suggestWardTransfers();

    res.json({
      success: true,
      count: suggestions.length,
       suggestions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transfer suggestions',
      error: error.message,
    });
  }
};

// Get ward by ID
exports.getWardById = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id)
      .populate('patients.patientId', 'userId dateOfBirth gender bloodGroup')
      .populate('assignedStaff', 'firstName lastName email role');

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found',
      });
    }

    res.json({
      success: true,
       ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ward',
      error: error.message,
    });
  }
};

// Create ward
exports.createWard = async (req, res) => {
  try {
    const ward = await Ward.create(req.body);

    await logAudit(req, req.user.userId, 'create', 'ward', 'success', {
      wardId: ward._id,
    });

    res.status(201).json({
      success: true,
      message: 'Ward created successfully',
       ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating ward',
      error: error.message,
    });
  }
};

// Update ward
exports.updateWard = async (req, res) => {
  try {
    const ward = await Ward.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found',
      });
    }

    await logAudit(req, req.user.userId, 'update', 'ward', 'success', {
      wardId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Ward updated successfully',
       ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating ward',
      error: error.message,
    });
  }
};

// Assign patient to ward
exports.assignPatientToWard = async (req, res) => {
  try {
    const { patientId, bedNumber, expectedDischargeDate } = req.body;

    const ward = await Ward.findById(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found',
      });
    }

    if (ward.availableBeds <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No available beds in this ward',
      });
    }

    ward.patients.push({
      patientId,
      bedNumber: bedNumber || `B${ward.occupiedBeds + 1}`,
      admissionDate: new Date(),
      expectedDischargeDate,
    });

    await ward.save();

    // Update patient record
    await Patient.findByIdAndUpdate(patientId, { assignedWard: ward._id });

    res.json({
      success: true,
      message: 'Patient assigned to ward successfully',
       ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning patient',
      error: error.message,
    });
  }
};

// Remove patient from ward
exports.removePatientFromWard = async (req, res) => {
  try {
    const { patientId } = req.body;

    const ward = await Ward.findById(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found',
      });
    }

    ward.patients = ward.patients.filter(
      p => p.patientId.toString() !== patientId
    );

    await ward.save();

    // Update patient record
    await Patient.findByIdAndUpdate(patientId, { assignedWard: null });

    res.json({
      success: true,
      message: 'Patient removed from ward successfully',
       ward,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing patient',
      error: error.message,
    });
  }
};

// Delete ward
exports.deleteWard = async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id);

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found',
      });
    }

    if (ward.patients.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete ward with patients',
      });
    }

    await ward.deleteOne();

    await logAudit(req, req.user.userId, 'delete', 'ward', 'success', {
      wardId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Ward deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting ward',
      error: error.message,
    });
  }
};

module.exports = exports;

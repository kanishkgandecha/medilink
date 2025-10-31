const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const AIScheduler = require('../services/aiScheduler');
const { logAudit } = require('../middleware/auth');

// Create appointment
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, timeSlot, type, reason, symptoms } = req.body;

    // Verify patient and doctor exist
    const patient = await Patient.findById(patientId);
    const doctor = await Doctor.findById(doctorId);

    if (!patient || !doctor) {
      return res.status(404).json({
        success: false,
        message: 'Patient or Doctor not found',
      });
    }

    // Check for conflicts
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate: {
        $gte: new Date(appointmentDate).setHours(0, 0, 0),
        $lt: new Date(appointmentDate).setHours(23, 59, 59),
      },
      'timeSlot.startTime': timeSlot.startTime,
      status: { $in: ['scheduled', 'confirmed', 'in-progress'] },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Time slot already booked',
      });
    }

    // AI predictions
    const aiPredictedDuration = await AIScheduler.predictDuration({
      type,
      patientId,
      doctorId,
    });

    const aiPriority = await AIScheduler.calculatePriority({
      type,
      symptoms,
      patientId,
    });

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      appointmentDate,
      timeSlot,
      type,
      reason,
      symptoms,
      aiPredictedDuration,
      aiPriority,
    });

    await appointment.populate(['patientId', 'doctorId']);

    await logAudit(req, req.user.userId, 'create', 'appointment', 'success', {
      appointmentId: appointment._id,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
       appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating appointment',
      error: error.message,
    });
  }
};

// Get all appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const { doctorId, patientId, status, date, type } = req.query;
    
    let query = {};
    
    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (date) {
      query.appointmentDate = {
        $gte: new Date(date).setHours(0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59),
      };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'userId dateOfBirth gender')
      .populate('doctorId', 'userId specialization')
      .populate('prescriptionId')
      .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 });

    res.json({
      success: true,
      count: appointments.length,
       appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message,
    });
  }
};

// Get my appointments (patient)
exports.getMyAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.userId });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found',
      });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId', 'userId specialization consultationFee')
      .sort({ appointmentDate: -1 });

    res.json({
      success: true,
      count: appointments.length,
       appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message,
    });
  }
};

// Get doctor appointments
exports.getDoctorAppointments = async (req, res) => {
  try {
    const { date } = req.query;
    const query = { doctorId: req.params.doctorId };

    if (date) {
      query.appointmentDate = {
        $gte: new Date(date).setHours(0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59),
      };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'userId dateOfBirth gender bloodGroup')
      .sort({ appointmentDate: 1, 'timeSlot.startTime': 1 });

    res.json({
      success: true,
      count: appointments.length,
       appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor appointments',
      error: error.message,
    });
  }
};

// Get optimal time slot
exports.getOptimalSlot = async (req, res) => {
  try {
    const { doctorId, date, duration } = req.body;

    const optimalSlot = await AIScheduler.findOptimalSlot(doctorId, date, duration);

    if (!optimalSlot) {
      return res.status(404).json({
        success: false,
        message: 'No available slots found',
      });
    }

    res.json({
      success: true,
       optimalSlot,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error finding optimal slot',
      error: error.message,
    });
  }
};

// Get appointment by ID
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId')
      .populate('prescriptionId');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.json({
      success: true,
       appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment',
      error: error.message,
    });
  }
};

// Update appointment
exports.updateAppointment = async (req, res) => {
  try {
    const allowedUpdates = ['status', 'diagnosis', 'notes', 'timeSlot'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate(['patientId', 'doctorId']);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    await logAudit(req, req.user.userId, 'update', 'appointment', 'success', {
      appointmentId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Appointment updated successfully',
       appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating appointment',
      error: error.message,
    });
  }
};

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: 'cancelled',
        cancelReason: reason,
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    await logAudit(req, req.user.userId, 'update', 'appointment', 'success', {
      appointmentId: req.params.id,
      action: 'cancelled',
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
       appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message,
    });
  }
};

// Complete appointment
exports.completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    res.json({
      success: true,
      message: 'Appointment completed successfully',
       appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing appointment',
      error: error.message,
    });
  }
};

// Delete appointment
exports.deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    await logAudit(req, req.user.userId, 'delete', 'appointment', 'success', {
      appointmentId: req.params.id,
    });

    res.json({
      success: true,
      message: 'Appointment deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting appointment',
      error: error.message,
    });
  }
};

module.exports = exports;

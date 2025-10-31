const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// Get all doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const { specialization } = req.query;
    let query = {};
    
    if (specialization) query.specialization = specialization;

    const doctors = await Doctor.find(query)
      .populate('userId', 'firstName lastName email phoneNumber')
      .sort({ rating: -1 });

    res.json({
      success: true,
      count: doctors.length,
       doctors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctors',
      error: error.message,
    });
  }
};

// Get doctor by ID
exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'firstName lastName email phoneNumber');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
       doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching doctor',
      error: error.message,
    });
  }
};

// Get doctor availability
exports.getDoctorAvailability = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching availability',
      error: error.message,
    });
  }
};

// Get doctor schedule
exports.getDoctorSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    const appointments = await Appointment.find({
      doctorId: req.params.id,
      appointmentDate: {
        $gte: new Date(date).setHours(0, 0, 0),
        $lt: new Date(date).setHours(23, 59, 59),
      },
    }).populate('patientId', 'userId');

    res.json({
      success: true,
       appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message,
    });
  }
};

// Update doctor
exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.json({
      success: true,
      message: 'Doctor updated successfully',
       doctor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating doctor',
      error: error.message,
    });
  }
};

// Update availability
exports.updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { availability },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Availability updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating availability',
      error: error.message,
    });
  }
};

// Get doctor statistics
exports.getDoctorStatistics = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.params.id });
    
    const stats = {
      totalAppointments: appointments.length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      noShow: appointments.filter(a => a.status === 'no-show').length,
    };

    res.json({
      success: true,
       stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message,
    });
  }
};


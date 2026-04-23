const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const Ward = require('../models/Ward');
const Billing = require('../models/Billing');
const Staff = require('../models/Staff');

// @desc    Get Admin Dashboard
// @route   GET /api/dashboards/admin
// @access  Private (Admin only)
const getAdminDashboard = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Comprehensive statistics
  const [
    totalUsers,
    totalDoctors,
    totalPatients,
    todayAppointments,
    pendingAppointments,
    totalBeds,
    lowStockMedicines,
    pendingBills,
    todayRevenue,
    activeStaff
  ] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Doctor.countDocuments({ isAvailable: true }),
    Patient.countDocuments(),
    Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow }
    }),
    Appointment.countDocuments({ status: 'Scheduled' }),
    Ward.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalBeds' }, available: { $sum: '$availableBeds' } } }
    ]),
    Medicine.countDocuments({
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
      isActive: true
    }),
    Billing.countDocuments({ paymentStatus: { $in: ['Unpaid', 'Partially-Paid'] } }),
    Billing.aggregate([
      { $match: { billDate: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),
    Staff.countDocuments({ isActive: true })
  ]);

  // Recent activities
  const recentAppointments = await Appointment.find()
    .sort('-createdAt')
    .limit(5)
    .populate({
      path: 'patient',
      select: 'patientId userId',
      populate: { path: 'userId', select: 'name' }
    })
    .populate({
      path: 'doctor',
      populate: { path: 'userId', select: 'name' }
    });

  const recentUsers = await User.find({ isActive: true })
    .sort('-createdAt')
    .limit(5)
    .select('name email role createdAt');

  res.status(200).json({
    success: true,
    role: 'Admin',
    dashboard: {
      overview: {
        totalUsers,
        totalDoctors,
        totalPatients,
        todayAppointments,
        pendingAppointments,
        totalBeds: totalBeds[0]?.total || 0,
        availableBeds: totalBeds[0]?.available || 0,
        occupiedBeds: (totalBeds[0]?.total || 0) - (totalBeds[0]?.available || 0),
        activeStaff
      },
      alerts: {
        lowStockMedicines,
        pendingBills,
        pendingAppointments
      },
      revenue: {
        today: todayRevenue[0]?.total || 0
      },
      recentActivities: {
        appointments: recentAppointments,
        users: recentUsers
      }
    },
    quickActions: [
      { label: 'Manage Users', route: '/api/auth/users' },
      { label: 'View All Doctors', route: '/api/doctors' },
      { label: 'View All Patients', route: '/api/patients' },
      { label: 'Manage Appointments', route: '/api/appointments' },
      { label: 'Manage Wards', route: '/api/wards' },
      { label: 'View Reports', route: '/api/reports/dashboard' },
      { label: 'Manage Staff', route: '/api/staff' },
      { label: 'Medicine Inventory', route: '/api/medicines' }
    ]
  });
};

// @desc    Get Doctor Dashboard
// @route   GET /api/dashboards/doctor
// @access  Private (Doctor only)
const getDoctorDashboard = async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  
  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found'
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Doctor-specific statistics
  const [
    todayAppointments,
    upcomingAppointments,
    completedToday,
    myPatients,
    pendingPrescriptions
  ] = await Promise.all([
    Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lt: tomorrow }
    })
      .populate('patient', 'patientId')
      .populate({ path: 'patient', populate: { path: 'userId', select: 'name phone' } })
      .sort('timeSlot.startTime'),
    
    Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: today },
      status: { $in: ['Scheduled', 'Confirmed'] }
    })
      .sort('appointmentDate')
      .limit(10)
      .populate('patient', 'patientId')
      .populate({ path: 'patient', populate: { path: 'userId', select: 'name phone' } }),
    
    Appointment.countDocuments({
      doctor: doctor._id,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: 'Completed'
    }),
    
    Patient.countDocuments({
      _id: { $in: await Appointment.distinct('patient', { doctor: doctor._id }) }
    }),
    
    Prescription.countDocuments({
      doctor: doctor._id,
      status: 'Pending'
    })
  ]);

  // Recent prescriptions
  const recentPrescriptions = await Prescription.find({ doctor: doctor._id })
    .sort('-createdAt')
    .limit(5)
    .populate('patient', 'patientId')
    .populate({ path: 'patient', populate: { path: 'userId', select: 'name' } });

  res.status(200).json({
    success: true,
    role: 'Doctor',
    doctorInfo: {
      name: req.user.name,
      specialization: doctor.specialization,
      department: doctor.department,
      experience: doctor.experience,
      rating: doctor.rating
    },
    dashboard: {
      overview: {
        todayAppointments: todayAppointments.length,
        completedToday,
        upcomingAppointments: upcomingAppointments.length,
        totalPatients: myPatients,
        pendingPrescriptions
      },
      todaySchedule: todayAppointments,
      upcomingAppointments: upcomingAppointments.slice(0, 5),
      recentPrescriptions
    },
    quickActions: [
      { label: 'My Appointments', route: `/api/appointments?doctor=${doctor._id}` },
      { label: 'My Patients', route: '/api/patients' },
      { label: 'Create Prescription', route: '/api/prescriptions' },
      { label: 'View Prescriptions', route: `/api/prescriptions?doctor=${doctor._id}` },
      { label: 'Update Availability', route: `/api/doctors/${doctor._id}/availability` }
    ]
  });
};

// @desc    Get Patient Dashboard
// @route   GET /api/dashboards/patient
// @access  Private (Patient only)
const getPatientDashboard = async (req, res) => {
  const patient = await Patient.findOne({ userId: req.user.id })
    .populate('userId');
  
  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient profile not found. Please complete your profile.'
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Patient-specific data
  const [
    upcomingAppointments,
    pastAppointments,
    activePrescriptions,
    unpaidBills
  ] = await Promise.all([
    Appointment.find({
      patient: patient._id,
      appointmentDate: { $gte: today },
      status: { $in: ['Scheduled', 'Confirmed'] }
    })
      .sort('appointmentDate')
      .populate({
        path: 'doctor',
        populate: { path: 'userId', select: 'name' }
      }),

    Appointment.find({
      patient: patient._id,
      status: 'Completed'
    })
      .sort('-appointmentDate')
      .limit(5)
      .populate({
        path: 'doctor',
        populate: { path: 'userId', select: 'name' }
      }),

    Prescription.find({
      patient: patient._id,
      status: { $in: ['Pending', 'Partially-Filled'] }
    })
      .sort('-createdAt')
      .populate({
        path: 'doctor',
        populate: { path: 'userId', select: 'name' }
      })
      .populate('medicines.medicine', 'name dosageForm'),
    
    Billing.find({
      patient: patient._id,
      paymentStatus: { $in: ['Unpaid', 'Partially-Paid'] }
    })
      .sort('-billDate')
  ]);

  res.status(200).json({
    success: true,
    role: 'Patient',
    patientInfo: {
      patientId: patient.patientId,
      name: req.user.name,
      bloodGroup: patient.bloodGroup,
      age: req.user.dateOfBirth ? Math.floor((Date.now() - new Date(req.user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      medicalHistory: patient.medicalHistory || [],
      allergies: patient.allergies || [],
      currentMedications: patient.currentMedications || [],
    },
    dashboard: {
      overview: {
        upcomingAppointments: upcomingAppointments.length,
        activePrescriptions: activePrescriptions.length,
        unpaidBills: unpaidBills.length,
        totalUnpaidAmount: unpaidBills.reduce((sum, bill) => sum + bill.balance, 0)
      },
      upcomingAppointments,
      recentVisits: pastAppointments,
      activePrescriptions,
      pendingBills: unpaidBills
    },
    quickActions: [
      { label: 'Book Appointment', route: '/api/appointments' },
      { label: 'View Doctors', route: '/api/doctors' },
      { label: 'My Appointments', route: `/api/appointments?patient=${patient._id}` },
      { label: 'My Prescriptions', route: `/api/prescriptions?patient=${patient._id}` },
      { label: 'My Bills', route: `/api/billing?patient=${patient._id}` },
      { label: 'Medical History', route: `/api/patients/${patient._id}` }
    ]
  });
};

// @desc    Get Nurse Dashboard
// @route   GET /api/dashboards/nurse
// @access  Private (Nurse only)
const getNurseDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Nurse-specific data
  const [
    todayAppointments,
    wardOccupancy,
    criticalPatients,
    pendingAdmissions
  ] = await Promise.all([
    Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow }
    }),
    
    Ward.find({ isActive: true })
      .select('wardNumber wardName wardType totalBeds availableBeds')
      .sort('wardNumber'),
    
    Appointment.find({
      priority: 'Emergency',
      status: { $in: ['Scheduled', 'Confirmed', 'In-Progress'] }
    })
      .populate({
        path: 'patient',
        select: 'patientId userId',
        populate: { path: 'userId', select: 'name' }
      })
      .limit(10),
    
    Appointment.countDocuments({
      type: 'Emergency',
      status: 'Scheduled'
    })
  ]);

  res.status(200).json({
    success: true,
    role: 'Nurse',
    nurseInfo: {
      name: req.user.name
    },
    dashboard: {
      overview: {
        todayAppointments,
        totalWards: wardOccupancy.length,
        occupiedBeds: wardOccupancy.reduce((sum, w) => sum + (w.totalBeds - w.availableBeds), 0),
        availableBeds: wardOccupancy.reduce((sum, w) => sum + w.availableBeds, 0),
        criticalPatients: criticalPatients.length,
        pendingAdmissions
      },
      wardOccupancy,
      criticalPatients
    },
    quickActions: [
      { label: 'View Wards', route: '/api/wards' },
      { label: 'Manage Beds', route: '/api/wards' },
      { label: 'View Patients', route: '/api/patients' },
      { label: 'Today Appointments', route: '/api/appointments?date=' + today.toISOString().split('T')[0] },
      { label: 'Emergency Cases', route: '/api/appointments?priority=Emergency' }
    ]
  });
};

// @desc    Get Receptionist Dashboard
// @route   GET /api/dashboards/receptionist
// @access  Private (Receptionist only)
const getReceptionistDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Receptionist-specific data
  const [
    todayAppointments,
    pendingAppointments,
    availableDoctors,
    pendingBills,
    todayRegistrations
  ] = await Promise.all([
    Appointment.find({
      appointmentDate: { $gte: today, $lt: tomorrow }
    })
      .sort('timeSlot.startTime')
      .populate({
        path: 'patient',
        select: 'patientId userId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .populate({
        path: 'doctor',
        populate: { path: 'userId', select: 'name' }
      }),
    
    Appointment.countDocuments({
      status: 'Scheduled'
    }),
    
    Doctor.countDocuments({
      isAvailable: true
    }),
    
    Billing.countDocuments({
      paymentStatus: { $in: ['Unpaid', 'Partially-Paid'] }
    }),
    
    Patient.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    })
  ]);

  res.status(200).json({
    success: true,
    role: 'Receptionist',
    receptionistInfo: {
      name: req.user.name
    },
    dashboard: {
      overview: {
        todayAppointments: todayAppointments.length,
        pendingAppointments,
        availableDoctors,
        pendingBills,
        todayRegistrations
      },
      todaySchedule: todayAppointments
    },
    quickActions: [
      { label: 'Register Patient', route: '/api/patients' },
      { label: 'Book Appointment', route: '/api/appointments' },
      { label: 'View Appointments', route: '/api/appointments' },
      { label: 'Generate Bill', route: '/api/billing' },
      { label: 'View Doctors', route: '/api/doctors' },
      { label: 'Check Ward Availability', route: '/api/wards?available=true' }
    ]
  });
};

// @desc    Get Pharmacist Dashboard
// @route   GET /api/dashboards/pharmacist
// @access  Private (Pharmacist only)
const getPharmacistDashboard = async (req, res) => {
  // Pharmacist-specific data
  const [
    pendingPrescriptions,
    lowStockMedicines,
    expiringMedicines,
    todayDispensed
  ] = await Promise.all([
    Prescription.find({
      status: 'Pending'
    })
      .sort('-createdAt')
      .limit(10)
      .populate({
        path: 'patient',
        select: 'patientId userId',
        populate: { path: 'userId', select: 'name' }
      })
      .populate({
        path: 'doctor',
        populate: { path: 'userId', select: 'name' }
      }),
    
    Medicine.find({
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
      isActive: true
    })
      .sort('stockQuantity')
      .limit(10),
    
    Medicine.find({
      expiryDate: { 
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        $gte: new Date()
      },
      isActive: true
    })
      .sort('expiryDate')
      .limit(10),
    
    Prescription.countDocuments({
      status: 'Fulfilled',
      updatedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    })
  ]);

  const totalMedicines = await Medicine.countDocuments({ isActive: true });

  res.status(200).json({
    success: true,
    role: 'Pharmacist',
    pharmacistInfo: {
      name: req.user.name
    },
    dashboard: {
      overview: {
        pendingPrescriptions: pendingPrescriptions.length,
        lowStockMedicines: lowStockMedicines.length,
        expiringMedicines: expiringMedicines.length,
        todayDispensed,
        totalMedicines
      },
      pendingPrescriptions,
      lowStockAlerts: lowStockMedicines,
      expiringAlerts: expiringMedicines
    },
    quickActions: [
      { label: 'View Prescriptions', route: '/api/prescriptions?status=Pending' },
      { label: 'Medicine Inventory', route: '/api/medicines' },
      { label: 'Low Stock Medicines', route: '/api/medicines/low-stock' },
      { label: 'Expiring Medicines', route: '/api/medicines/expiring' },
      { label: 'Add Medicine', route: '/api/medicines' },
      { label: 'Update Stock', route: '/api/medicines' }
    ]
  });
};

module.exports = {
  getAdminDashboard,
  getDoctorDashboard,
  getPatientDashboard,
  getNurseDashboard,
  getReceptionistDashboard,
  getPharmacistDashboard
};
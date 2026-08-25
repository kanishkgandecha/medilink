const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { formatAppointment } = require('../utils/virtuals');

const formatPopulatedApt = (apt) => {
  if (!apt) return null;
  const formatted = formatAppointment(apt);
  return {
    ...formatted,
    _id: formatted.id,
    patient: formatted.patient
      ? {
          ...formatted.patient,
          _id: formatted.patient.id,
          userId: formatted.patient.user ? { ...formatted.patient.user, _id: formatted.patient.user.id } : null,
        }
      : null,
    doctor: formatted.doctor
      ? {
          ...formatted.doctor,
          _id: formatted.doctor.id,
          userId: formatted.doctor.user ? { ...formatted.doctor.user, _id: formatted.doctor.user.id } : null,
        }
      : null,
  };
};

const getAdminDashboard = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalUsers,
    totalDoctors,
    totalPatients,
    todayAppointments,
    pendingAppointments,
    wards,
    medicines,
    pendingBills,
    todayBills,
    activeStaff,
  ] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.doctor.count({ where: { isAvailable: true } }),
    prisma.patient.count(),
    prisma.appointment.count({
      where: { appointmentDate: { gte: today, lt: tomorrow } },
    }),
    prisma.appointment.count({ where: { status: 'Scheduled' } }),
    prisma.ward.findMany({ where: { isActive: true } }),
    prisma.medicine.findMany({ where: { isActive: true } }),
    prisma.billing.count({ where: { paymentStatus: { in: ['Unpaid', 'Partially_Paid'] } } }),
    prisma.billing.findMany({ where: { billDate: { gte: today, lt: tomorrow } } }),
    prisma.staff.count({ where: { isActive: true } }),
  ]);

  const totalBedsCount = wards.reduce((sum, w) => sum + w.totalBeds, 0);
  const availableBedsCount = wards.reduce((sum, w) => sum + w.availableBeds, 0);

  const lowStockMedicines = medicines.filter((m) => m.stockQuantity <= m.reorderLevel).length;
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringMedicines = medicines.filter(
    (m) => new Date(m.expiryDate) <= thirtyDaysLater && new Date(m.expiryDate) >= today
  ).length;

  const todayRevenueTotal = todayBills.reduce((sum, b) => sum + b.amountPaid, 0);

  const recentAppointments = await prisma.appointment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
      doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
    },
  });

  const recentUsers = await prisma.user.findMany({
    where: { isActive: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearBills = await prisma.billing.findMany({
    where: {
      billDate: { gte: yearStart },
      paymentStatus: { in: ['Paid', 'Partially_Paid'] },
    },
  });

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap = {};
  yearBills.forEach((b) => {
    const m = new Date(b.billDate).getMonth();
    monthMap[m] = (monthMap[m] || 0) + b.amountPaid;
  });

  const revenueByMonth = MONTHS.map((month, i) => ({
    month,
    Revenue: monthMap[i] || 0,
  }));

  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const weekAppointments = await prisma.appointment.findMany({
    where: { appointmentDate: { gte: weekStart, lt: weekEnd } },
  });

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = {};
  weekAppointments.forEach((a) => {
    const d = new Date(a.appointmentDate).getDay();
    const labelIdx = d === 0 ? 6 : d - 1;
    if (labelIdx < 6) dayCounts[labelIdx] = (dayCounts[labelIdx] || 0) + 1;
  });

  const weeklyTrend = DAY_LABELS.map((day, i) => ({
    day,
    Appointments: dayCounts[i] || 0,
  }));

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
        totalBeds: totalBedsCount,
        availableBeds: availableBedsCount,
        occupiedBeds: totalBedsCount - availableBedsCount,
        activeStaff,
      },
      alerts: {
        lowStockMedicines,
        expiringMedicines,
        pendingBills,
        pendingAppointments,
      },
      revenue: {
        today: todayRevenueTotal,
        monthly: revenueByMonth,
      },
      weeklyAppointments: weeklyTrend,
      recentActivities: {
        appointments: recentAppointments.map(formatPopulatedApt),
        users: recentUsers.map((u) => ({ ...u, _id: u.id })),
      },
    },
    quickActions: [
      { label: 'Manage Users', route: '/api/auth/users' },
      { label: 'View All Doctors', route: '/api/doctors' },
      { label: 'View All Patients', route: '/api/patients' },
      { label: 'Manage Appointments', route: '/api/appointments' },
      { label: 'Manage Wards', route: '/api/wards' },
      { label: 'View Reports', route: '/api/reports/dashboard' },
      { label: 'Manage Staff', route: '/api/staff' },
      { label: 'Medicine Inventory', route: '/api/medicines' },
    ],
  });
};

const getDoctorDashboard = async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { userId: req.user.id },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayAppointments,
    upcomingAppointments,
    completedToday,
    doctorAppointments,
    pendingPrescriptions,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true, phone: true } } } },
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId: doctor.id,
        appointmentDate: { gte: today },
        status: { in: ['Scheduled', 'Confirmed'] },
      },
      take: 10,
      orderBy: { appointmentDate: 'asc' },
      include: {
        patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true, phone: true } } } },
      },
    }),
    prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        appointmentDate: { gte: today, lt: tomorrow },
        status: 'Completed',
      },
    }),
    prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      select: { patientId: true },
      distinct: ['patientId'],
    }),
    prisma.prescription.count({
      where: {
        doctorId: doctor.id,
        status: 'Pending',
      },
    }),
  ]);

  const recentPrescriptions = await prisma.prescription.findMany({
    where: { doctorId: doctor.id },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
    },
  });

  res.status(200).json({
    success: true,
    role: 'Doctor',
    doctorInfo: {
      name: req.user.name,
      specialization: doctor.specialization,
      department: doctor.department,
      experience: doctor.experience,
      rating: doctor.rating,
    },
    dashboard: {
      overview: {
        todayAppointments: todayAppointments.length,
        completedToday,
        upcomingAppointments: upcomingAppointments.length,
        totalPatients: doctorAppointments.length,
        pendingPrescriptions,
      },
      todaySchedule: todayAppointments.map(formatPopulatedApt),
      upcomingAppointments: upcomingAppointments.slice(0, 5).map(formatPopulatedApt),
      recentPrescriptions: recentPrescriptions.map((rx) => ({
        ...rx,
        _id: rx.id,
        patient: rx.patient ? { ...rx.patient, _id: rx.patient.id, userId: rx.patient.user ? { ...rx.patient.user, _id: rx.patient.user.id } : null } : null,
      })),
    },
    quickActions: [
      { label: 'My Appointments', route: `/api/appointments?doctor=${doctor.id}` },
      { label: 'My Patients', route: '/api/patients' },
      { label: 'Create Prescription', route: '/api/prescriptions' },
      { label: 'View Prescriptions', route: `/api/prescriptions?doctor=${doctor.id}` },
      { label: 'Update Availability', route: `/api/doctors/${doctor.id}/availability` },
    ],
  });
};

const getPatientDashboard = async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { userId: req.user.id },
    include: {
      user: true,
      medicalHistory: { where: { isVoided: false } },
      currentMedications: true,
    },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient profile not found. Please complete your profile.',
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    upcomingAppointments,
    pastAppointments,
    activePrescriptions,
    unpaidBills,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        appointmentDate: { gte: today },
        status: { in: ['Scheduled', 'Confirmed'] },
      },
      orderBy: { appointmentDate: 'asc' },
      include: {
        doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        patientId: patient.id,
        status: 'Completed',
      },
      take: 5,
      orderBy: { appointmentDate: 'desc' },
      include: {
        doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.prescription.findMany({
      where: {
        patientId: patient.id,
        status: { in: ['Pending', 'Partially_Filled'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
        medicines: { include: { medicine: { select: { id: true, name: true, dosageForm: true } } } },
      },
    }),
    prisma.billing.findMany({
      where: {
        patientId: patient.id,
        paymentStatus: { in: ['Unpaid', 'Partially_Paid'] },
      },
      orderBy: { billDate: 'desc' },
    }),
  ]);

  res.status(200).json({
    success: true,
    role: 'Patient',
    patientInfo: {
      patientId: patient.patientId,
      name: req.user.name,
      bloodGroup: patient.bloodGroup,
      age: req.user.dateOfBirth
        ? Math.floor((Date.now() - new Date(req.user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      medicalHistory: patient.medicalHistory || [],
      allergies: patient.allergies || [],
      currentMedications: patient.currentMedications || [],
    },
    dashboard: {
      overview: {
        upcomingAppointments: upcomingAppointments.length,
        activePrescriptions: activePrescriptions.length,
        unpaidBills: unpaidBills.length,
        totalUnpaidAmount: unpaidBills.reduce((sum, bill) => sum + bill.balance, 0),
      },
      upcomingAppointments: upcomingAppointments.map(formatPopulatedApt),
      recentVisits: pastAppointments.map(formatPopulatedApt),
      activePrescriptions: activePrescriptions.map((rx) => ({
        ...rx,
        _id: rx.id,
        doctor: rx.doctor ? { ...rx.doctor, _id: rx.doctor.id, userId: rx.doctor.user ? { ...rx.doctor.user, _id: rx.doctor.user.id } : null } : null,
      })),
      pendingBills: unpaidBills.map((b) => ({ ...b, _id: b.id })),
    },
    quickActions: [
      { label: 'Book Appointment', route: '/api/appointments' },
      { label: 'View Doctors', route: '/api/doctors' },
      { label: 'My Appointments', route: `/api/appointments?patient=${patient.id}` },
      { label: 'My Prescriptions', route: `/api/prescriptions?patient=${patient.id}` },
      { label: 'My Bills', route: `/api/billing?patient=${patient.id}` },
      { label: 'Medical History', route: `/api/patients/${patient.id}` },
    ],
  });
};

const getNurseDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayAppointments,
    wardOccupancy,
    criticalPatients,
    pendingAdmissions,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { appointmentDate: { gte: today, lt: tomorrow } },
    }),
    prisma.ward.findMany({
      where: { isActive: true },
      select: { id: true, wardNumber: true, wardName: true, wardType: true, totalBeds: true, availableBeds: true },
      orderBy: { wardNumber: 'asc' },
    }),
    prisma.appointment.findMany({
      where: {
        priority: 'Emergency',
        status: { in: ['Scheduled', 'Confirmed', 'In_Progress'] },
      },
      take: 10,
      include: {
        patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.appointment.count({
      where: {
        type: 'Emergency',
        status: 'Scheduled',
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    role: 'Nurse',
    nurseInfo: {
      name: req.user.name,
    },
    dashboard: {
      overview: {
        todayAppointments,
        totalWards: wardOccupancy.length,
        occupiedBeds: wardOccupancy.reduce((sum, w) => sum + (w.totalBeds - w.availableBeds), 0),
        availableBeds: wardOccupancy.reduce((sum, w) => sum + w.availableBeds, 0),
        criticalPatients: criticalPatients.length,
        pendingAdmissions,
      },
      wardOccupancy: wardOccupancy.map((w) => ({ ...w, _id: w.id })),
      criticalPatients: criticalPatients.map(formatPopulatedApt),
    },
    quickActions: [
      { label: 'View Wards', route: '/api/wards' },
      { label: 'Manage Beds', route: '/api/wards' },
      { label: 'View Patients', route: '/api/patients' },
      { label: 'Today Appointments', route: '/api/appointments?date=' + today.toISOString().split('T')[0] },
      { label: 'Emergency Cases', route: '/api/appointments?priority=Emergency' },
    ],
  });
};

const getReceptionistDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayAppointments,
    pendingAppointments,
    availableDoctors,
    pendingBills,
    todayRegistrations,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { appointmentDate: { gte: today, lt: tomorrow } },
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true, phone: true } } } },
        doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.appointment.count({ where: { status: 'Scheduled' } }),
    prisma.doctor.count({ where: { isAvailable: true } }),
    prisma.billing.count({ where: { paymentStatus: { in: ['Unpaid', 'Partially_Paid'] } } }),
    prisma.patient.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
  ]);

  res.status(200).json({
    success: true,
    role: 'Receptionist',
    receptionistInfo: {
      name: req.user.name,
    },
    dashboard: {
      overview: {
        todayAppointments: todayAppointments.length,
        pendingAppointments,
        availableDoctors,
        pendingBills,
        todayRegistrations,
      },
      todaySchedule: todayAppointments.map(formatPopulatedApt),
    },
    quickActions: [
      { label: 'Register Patient', route: '/api/patients' },
      { label: 'Book Appointment', route: '/api/appointments' },
      { label: 'View Appointments', route: '/api/appointments' },
      { label: 'Generate Bill', route: '/api/billing' },
      { label: 'View Doctors', route: '/api/doctors' },
      { label: 'Check Ward Availability', route: '/api/wards?available=true' },
    ],
  });
};

const getPharmacistDashboard = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    pendingPrescriptions,
    medicines,
    expiringMedicines,
    todayDispensed,
    totalMedicines,
  ] = await Promise.all([
    prisma.prescription.findMany({
      where: { status: 'Pending' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
        doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.medicine.findMany({ where: { isActive: true }, orderBy: { stockQuantity: 'asc' } }),
    prisma.medicine.findMany({
      where: {
        expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gte: new Date() },
        isActive: true,
      },
      take: 10,
      orderBy: { expiryDate: 'asc' },
    }),
    prisma.prescription.count({
      where: {
        status: 'Fulfilled',
        createdAt: { gte: today },
      },
    }),
    prisma.medicine.count({ where: { isActive: true } }),
  ]);

  const lowStockMedicines = medicines.filter((m) => m.stockQuantity <= m.reorderLevel).slice(0, 10);

  res.status(200).json({
    success: true,
    role: 'Pharmacist',
    pharmacistInfo: {
      name: req.user.name,
    },
    dashboard: {
      overview: {
        pendingPrescriptions: pendingPrescriptions.length,
        lowStockMedicines: lowStockMedicines.length,
        expiringMedicines: expiringMedicines.length,
        todayDispensed,
        totalMedicines,
      },
      pendingPrescriptions: pendingPrescriptions.map((rx) => ({
        ...rx,
        _id: rx.id,
        patient: rx.patient ? { ...rx.patient, _id: rx.patient.id, userId: rx.patient.user ? { ...rx.patient.user, _id: rx.patient.user.id } : null } : null,
        doctor: rx.doctor ? { ...rx.doctor, _id: rx.doctor.id, userId: rx.doctor.user ? { ...rx.doctor.user, _id: rx.doctor.user.id } : null } : null,
      })),
      lowStockAlerts: lowStockMedicines.map((m) => ({ ...m, _id: m.id })),
      expiringAlerts: expiringMedicines.map((m) => ({ ...m, _id: m.id })),
    },
    quickActions: [
      { label: 'View Prescriptions', route: '/api/prescriptions?status=Pending' },
      { label: 'Medicine Inventory', route: '/api/medicines' },
      { label: 'Low Stock Medicines', route: '/api/medicines/low-stock' },
      { label: 'Expiring Medicines', route: '/api/medicines/expiring' },
      { label: 'Add Medicine', route: '/api/medicines' },
      { label: 'Update Stock', route: '/api/medicines' },
    ],
  });
};

module.exports = {
  getAdminDashboard: asyncHandler(getAdminDashboard),
  getDoctorDashboard: asyncHandler(getDoctorDashboard),
  getPatientDashboard: asyncHandler(getPatientDashboard),
  getNurseDashboard: asyncHandler(getNurseDashboard),
  getReceptionistDashboard: asyncHandler(getReceptionistDashboard),
  getPharmacistDashboard: asyncHandler(getPharmacistDashboard),
};

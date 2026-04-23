// ===========================
// FILE: controllers/reportController.js
// ===========================
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Ward = require('../models/Ward');
const Billing = require('../models/Billing');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');

// @desc    Get patient visits report
// @route   GET /api/reports/patient-visits
// @access  Private (Admin)
const getPatientVisitsReport = async (req, res) => {
  const { startDate, endDate, doctorId, patientId } = req.query;
  
  let query = {};
  
  if (startDate && endDate) {
    query.appointmentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (doctorId) query.doctor = doctorId;
  if (patientId) query.patient = patientId;

  const visits = await Appointment.find(query)
    .populate({
      path: 'patient',
      select: 'patientId userId',
      populate: { path: 'userId', select: 'name gender dateOfBirth' }
    })
    .populate({
      path: 'doctor',
      select: 'userId specialization',
      populate: { path: 'userId', select: 'name' }
    })
    .sort('-appointmentDate');

  const stats = {
    totalVisits: visits.length,
    completed: visits.filter(v => v.status === 'Completed').length,
    scheduled: visits.filter(v => v.status === 'Scheduled').length,
    cancelled: visits.filter(v => v.status === 'Cancelled').length,
    noShow: visits.filter(v => v.status === 'No-Show').length,
    byType: visits.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {}),
    byPriority: visits.reduce((acc, v) => {
      acc[v.priority] = (acc[v.priority] || 0) + 1;
      return acc;
    }, {})
  };

  res.status(200).json({
    success: true,
    stats,
    count: visits.length,
    data: visits
  });
};

// @desc    Get doctor performance report
// @route   GET /api/reports/doctor-performance
// @access  Private (Admin)
const getDoctorPerformanceReport = async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;
  
  let matchQuery = { status: 'Completed' };
  
  if (doctorId) matchQuery.doctor = mongoose.Types.ObjectId(doctorId);
  
  if (startDate && endDate) {
    matchQuery.appointmentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const performance = await Appointment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$doctor',
        totalAppointments: { $sum: 1 },
        completedAppointments: {
          $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
        },
        cancelledAppointments: {
          $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] }
        },
        emergencyCases: {
          $sum: { $cond: [{ $eq: ['$priority', 'Emergency'] }, 1, 0] }
        },
        avgConsultationFee: { $avg: '$consultationFee' }
      }
    },
    {
      $lookup: {
        from: 'doctors',
        localField: '_id',
        foreignField: '_id',
        as: 'doctorInfo'
      }
    },
    { $unwind: '$doctorInfo' },
    {
      $lookup: {
        from: 'users',
        localField: 'doctorInfo.userId',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        doctorName: '$userInfo.name',
        specialization: '$doctorInfo.specialization',
        department: '$doctorInfo.department',
        totalAppointments: 1,
        completedAppointments: 1,
        cancelledAppointments: 1,
        emergencyCases: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedAppointments', '$totalAppointments'] },
            100
          ]
        },
        rating: '$doctorInfo.rating'
      }
    },
    { $sort: { totalAppointments: -1 } }
  ]);

  res.status(200).json({
    success: true,
    count: performance.length,
    data: performance
  });
};

// @desc    Get ward usage report
// @route   GET /api/reports/ward-usage
// @access  Private (Admin)
const getWardUsageReport =   async (req, res) => {
  const { wardType, floor } = req.query;
  
  let query = { isActive: true };
  if (wardType) query.wardType = wardType;
  if (floor) query.floor = parseInt(floor);

  const wards = await Ward.find(query)
    .populate('nurseInCharge', 'name phone');

  const wardStats = wards.map(ward => {
    const occupiedBeds = ward.totalBeds - ward.availableBeds;
    const occupancyRate = (occupiedBeds / ward.totalBeds * 100).toFixed(2);
    
    return {
      wardId: ward._id,
      wardNumber: ward.wardNumber,
      wardName: ward.wardName,
      wardType: ward.wardType,
      department: ward.department,
      floor: ward.floor,
      totalBeds: ward.totalBeds,
      occupiedBeds,
      availableBeds: ward.availableBeds,
      occupancyRate: parseFloat(occupancyRate),
      dailyRate: ward.dailyRate,
      potentialRevenue: occupiedBeds * ward.dailyRate,
      nurseInCharge: ward.nurseInCharge ? ward.nurseInCharge.name : 'Not Assigned',
      gender: ward.gender
    };
  });

  const overall = {
    totalWards: wards.length,
    totalBeds: wards.reduce((sum, w) => sum + w.totalBeds, 0),
    occupiedBeds: wards.reduce((sum, w) => sum + (w.totalBeds - w.availableBeds), 0),
    availableBeds: wards.reduce((sum, w) => sum + w.availableBeds, 0),
    averageOccupancyRate: (
      wardStats.reduce((sum, w) => sum + w.occupancyRate, 0) / wards.length
    ).toFixed(2),
    totalPotentialRevenue: wardStats.reduce((sum, w) => sum + w.potentialRevenue, 0),
    byType: wards.reduce((acc, w) => {
      if (!acc[w.wardType]) {
        acc[w.wardType] = { count: 0, totalBeds: 0, occupied: 0 };
      }
      acc[w.wardType].count += 1;
      acc[w.wardType].totalBeds += w.totalBeds;
      acc[w.wardType].occupied += (w.totalBeds - w.availableBeds);
      return acc;
    }, {})
  };

  res.status(200).json({
    success: true,
    overall,
    count: wards.length,
    data: wardStats
  });
};

// @desc    Get revenue report
// @route   GET /api/reports/revenue
// @access  Private (Admin)
const getRevenueReport =   async (req, res) => {
  const { startDate, endDate, category, paymentStatus } = req.query;
  
  let query = {};
  
  if (startDate && endDate) {
    query.billDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const bills = await Billing.find(query)
    .populate('patient', 'patientId userId')
    .populate({ path: 'patient', populate: { path: 'userId', select: 'name' } })
    .sort('-billDate');

  // Filter by category if specified
  let filteredBills = bills;
  if (category) {
    filteredBills = bills.filter(bill => 
      bill.items.some(item => item.category === category)
    );
  }

  const stats = {
    totalBills: filteredBills.length,
    totalRevenue: filteredBills.reduce((sum, b) => sum + b.totalAmount, 0),
    totalPaid: filteredBills.reduce((sum, b) => sum + b.amountPaid, 0),
    totalPending: filteredBills.reduce((sum, b) => sum + b.balance, 0),
    averageBillAmount: filteredBills.length > 0 
      ? (filteredBills.reduce((sum, b) => sum + b.totalAmount, 0) / filteredBills.length).toFixed(2)
      : 0,
    
    byCategory: filteredBills.reduce((acc, bill) => {
      bill.items.forEach(item => {
        if (!acc[item.category]) {
          acc[item.category] = { count: 0, revenue: 0 };
        }
        acc[item.category].count += item.quantity;
        acc[item.category].revenue += item.amount;
      });
      return acc;
    }, {}),
    
    byPaymentStatus: {
      paid: filteredBills.filter(b => b.paymentStatus === 'Paid').length,
      unpaid: filteredBills.filter(b => b.paymentStatus === 'Unpaid').length,
      partiallyPaid: filteredBills.filter(b => b.paymentStatus === 'Partially-Paid').length,
      refunded: filteredBills.filter(b => b.paymentStatus === 'Refunded').length
    },
    
    byPaymentMethod: filteredBills.reduce((acc, bill) => {
      if (bill.paymentMethod) {
        if (!acc[bill.paymentMethod]) {
          acc[bill.paymentMethod] = { count: 0, amount: 0 };
        }
        acc[bill.paymentMethod].count += 1;
        acc[bill.paymentMethod].amount += bill.amountPaid;
      }
      return acc;
    }, {}),
    
    discountGiven: filteredBills.reduce((sum, b) => sum + (b.discount || 0), 0),
    taxCollected: filteredBills.reduce((sum, b) => sum + (b.tax || 0), 0),
    
    insuranceClaims: {
      total: filteredBills.filter(b => b.insuranceClaim).length,
      approved: filteredBills.filter(b => b.insuranceClaim?.status === 'Approved').length,
      pending: filteredBills.filter(b => b.insuranceClaim?.status === 'Pending').length,
      rejected: filteredBills.filter(b => b.insuranceClaim?.status === 'Rejected').length,
      totalClaimedAmount: filteredBills.reduce((sum, b) => 
        sum + (b.insuranceClaim?.amountClaimed || 0), 0
      )
    }
  };

  res.status(200).json({
    success: true,
    stats,
    count: filteredBills.length,
    data: filteredBills
  });
};

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private (Admin)
const getDashboardStats =   async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients,
    totalDoctors,
    todayAppointments,
    activeBeds,
    todayRevenue,
    lowStockMedicines,
    expiringMedicines,
    pendingPrescriptions,
    activeStaff
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments({ isAvailable: true }),
    Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['Scheduled', 'Confirmed', 'In-Progress'] }
    }),
    Ward.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$totalBeds' }, 
          available: { $sum: '$availableBeds' } 
        } 
      }
    ]),
    Billing.aggregate([
      { $match: { billDate: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),
    Medicine.countDocuments({
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
      isActive: true
    }),
    Medicine.countDocuments({
      expiryDate: { 
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        $gte: new Date()
      },
      isActive: true
    }),
    Prescription.countDocuments({ status: 'Pending' }),
    Staff.countDocuments({ isActive: true })
  ]);

  // Get recent activities
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
      select: 'userId',
      populate: { path: 'userId', select: 'name' }
    });

  const recentBills = await Billing.find()
    .sort('-billDate')
    .limit(5)
    .populate({
      path: 'patient',
      select: 'patientId userId',
      populate: { path: 'userId', select: 'name' }
    });

  // Calculate trends (compare with last 7 days)
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const lastWeekAppointments = await Appointment.countDocuments({
    appointmentDate: { $gte: lastWeek, $lt: today }
  });

  const lastWeekRevenue = await Billing.aggregate([
    { $match: { billDate: { $gte: lastWeek, $lt: today } } },
    { $group: { _id: null, total: { $sum: '$amountPaid' } } }
  ]);

  res.status(200).json({
    success: true,
    stats: {
      patients: {
        total: totalPatients,
        new: 0 // Can be calculated based on recent registrations
      },
      doctors: {
        total: totalDoctors,
        active: totalDoctors
      },
      appointments: {
        today: todayAppointments,
        trend: lastWeekAppointments > 0 
          ? ((todayAppointments - lastWeekAppointments / 7) / (lastWeekAppointments / 7) * 100).toFixed(2)
          : 0
      },
      beds: {
        total: activeBeds[0]?.total || 0,
        occupied: (activeBeds[0]?.total || 0) - (activeBeds[0]?.available || 0),
        available: activeBeds[0]?.available || 0,
        occupancyRate: activeBeds[0]?.total 
          ? (((activeBeds[0].total - activeBeds[0].available) / activeBeds[0].total) * 100).toFixed(2)
          : 0
      },
      revenue: {
        today: todayRevenue[0]?.total || 0,
        trend: lastWeekRevenue[0]?.total 
          ? ((todayRevenue[0]?.total || 0) - (lastWeekRevenue[0].total / 7)) / (lastWeekRevenue[0].total / 7) * 100
          : 0
      },
      alerts: {
        lowStockMedicines,
        expiringMedicines,
        pendingPrescriptions
      },
      staff: {
        total: activeStaff
      }
    },
    recentActivities: {
      appointments: recentAppointments,
      bills: recentBills
    }
  });
};

// @desc    Get appointment statistics
// @route   GET /api/reports/appointments
// @access  Private (Admin)
const getAppointmentStats =   async (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;
  
  let matchQuery = {};
  
  if (startDate && endDate) {
    matchQuery.appointmentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Group by time period
  let groupByFormat;
  switch(groupBy) {
    case 'day':
      groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } };
      break;
    case 'week':
      groupByFormat = { $week: '$appointmentDate' };
      break;
    case 'month':
      groupByFormat = { $dateToString: { format: '%Y-%m', date: '$appointmentDate' } };
      break;
    default:
      groupByFormat = { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } };
  }

  const appointmentTrends = await Appointment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: groupByFormat,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', 'No-Show'] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const bySpecialization = await Appointment.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'doctors',
        localField: 'doctor',
        foreignField: '_id',
        as: 'doctorInfo'
      }
    },
    { $unwind: '$doctorInfo' },
    {
      $group: {
        _id: '$doctorInfo.specialization',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const byTimeSlot = await Appointment.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$timeSlot.startTime',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      trends: appointmentTrends,
      bySpecialization,
      byTimeSlot
    }
  });
};

// @desc    Get medicine consumption report
// @route   GET /api/reports/medicine-consumption
// @access  Private (Admin, Pharmacist)
const getMedicineConsumptionReport =   async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let matchQuery = { status: { $in: ['Fulfilled', 'Partially-Filled'] } };
  
  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const consumption = await Prescription.aggregate([
    { $match: matchQuery },
    { $unwind: '$medicines' },
    {
      $group: {
        _id: '$medicines.medicine',
        totalDispensed: { $sum: '$medicines.quantity' },
        prescriptionCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'medicines',
        localField: '_id',
        foreignField: '_id',
        as: 'medicineInfo'
      }
    },
    { $unwind: '$medicineInfo' },
    {
      $project: {
        medicineName: '$medicineInfo.name',
        genericName: '$medicineInfo.genericName',
        category: '$medicineInfo.category',
        totalDispensed: 1,
        prescriptionCount: 1,
        currentStock: '$medicineInfo.stockQuantity',
        reorderLevel: '$medicineInfo.reorderLevel',
        unitPrice: '$medicineInfo.unitPrice',
        totalValue: { $multiply: ['$totalDispensed', '$medicineInfo.unitPrice'] }
      }
    },
    { $sort: { totalDispensed: -1 } }
  ]);

  const stats = {
    totalMedicinesDispensed: consumption.reduce((sum, item) => sum + item.totalDispensed, 0),
    totalValue: consumption.reduce((sum, item) => sum + item.totalValue, 0),
    uniqueMedicines: consumption.length,
    averagePerPrescription: consumption.length > 0
      ? (consumption.reduce((sum, item) => sum + item.totalDispensed, 0) / 
         consumption.reduce((sum, item) => sum + item.prescriptionCount, 0)).toFixed(2)
      : 0
  };

  res.status(200).json({
    success: true,
    stats,
    count: consumption.length,
    data: consumption
  });
};

// @desc    Get staff performance report
// @route   GET /api/reports/staff-performance
// @access  Private (Admin)
const getStaffPerformanceReport =   async (req, res) => {
  const { department, designation } = req.query;
  
  let query = { isActive: true };
  if (department) query.department = department;
  if (designation) query.designation = designation;

  const staff = await Staff.find(query)
    .populate('userId', 'name email phone role')
    .populate('supervisor', 'name');

  const staffStats = staff.map(member => ({
    employeeId: member.employeeId,
    name: member.userId.name,
    designation: member.designation,
    department: member.department,
    employmentType: member.employmentType,
    joiningDate: member.joiningDate,
    experience: ((Date.now() - member.joiningDate) / (365 * 24 * 60 * 60 * 1000)).toFixed(1) + ' years',
    salary: member.salary.total,
    performanceRating: member.performance?.rating || 'Not Rated',
    lastReviewDate: member.performance?.lastReviewDate,
    supervisor: member.supervisor?.name || 'Not Assigned'
  }));

  const summary = {
    totalStaff: staff.length,
    byDepartment: staff.reduce((acc, s) => {
      acc[s.department] = (acc[s.department] || 0) + 1;
      return acc;
    }, {}),
    byDesignation: staff.reduce((acc, s) => {
      acc[s.designation] = (acc[s.designation] || 0) + 1;
      return acc;
    }, {}),
    byEmploymentType: staff.reduce((acc, s) => {
      acc[s.employmentType] = (acc[s.employmentType] || 0) + 1;
      return acc;
    }, {}),
    averageRating: staff.filter(s => s.performance?.rating).length > 0
      ? (staff.reduce((sum, s) => sum + (s.performance?.rating || 0), 0) / 
         staff.filter(s => s.performance?.rating).length).toFixed(2)
      : 0,
    totalSalaryBudget: staff.reduce((sum, s) => sum + (s.salary?.total || 0), 0)
  };

  res.status(200).json({
    success: true,
    summary,
    count: staff.length,
    data: staffStats
  });
};

// @desc    Get financial summary report
// @route   GET /api/reports/financial-summary
// @access  Private (Admin)
const getFinancialSummaryReport =   async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateQuery = {};
  if (startDate && endDate) {
    dateQuery = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const [revenue, expenses] = await Promise.all([
    Billing.aggregate([
      { $match: { billDate: dateQuery } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$amountPaid' },
          totalPending: { $sum: '$balance' },
          totalDiscount: { $sum: '$discount' },
          totalTax: { $sum: '$tax' }
        }
      }
    ]),
    Staff.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalSalaries: { $sum: '$salary.total' }
        }
      }
    ])
  ]);

  const medicineInventoryValue = await Medicine.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalValue: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } }
      }
    }
  ]);

  const profitLoss = {
    revenue: revenue[0]?.totalCollected || 0,
    expenses: (expenses[0]?.totalSalaries || 0),
    netProfit: (revenue[0]?.totalCollected || 0) - (expenses[0]?.totalSalaries || 0)
  };

  res.status(200).json({
    success: true,
    data: {
      revenue: revenue[0] || {},
      expenses: {
        salaries: expenses[0]?.totalSalaries || 0,
        total: expenses[0]?.totalSalaries || 0
      },
      inventory: {
        medicineValue: medicineInventoryValue[0]?.totalValue || 0
      },
      profitLoss
    }
  });
};

// @desc    Export report data (CSV format support)
// @route   GET /api/reports/export
// @access  Private (Admin)
const exportReport =   async (req, res) => {
  const { reportType, format = 'json', startDate, endDate } = req.query;
  
  let data;
  
  switch(reportType) {
    case 'revenue':
      data = await Billing.find({
        billDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });
      break;
    case 'appointments':
      data = await Appointment.find({
        appointmentDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }).populate('patient doctor');
      break;
    case 'medicines':
      data = await Medicine.find({ isActive: true });
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid report type'
      });
  }

  if (format === 'csv') {
    // Convert to CSV format (simplified)
    const csv = data.map(item => Object.values(item).join(',')).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`${reportType}_report.csv`);
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
};

module.exports = {
  getPatientVisitsReport,
  getDoctorPerformanceReport,
  getWardUsageReport,
  getRevenueReport,
  getDashboardStats,
  getAppointmentStats,
  getMedicineConsumptionReport,
  getStaffPerformanceReport,
  getFinancialSummaryReport,
  exportReport
};
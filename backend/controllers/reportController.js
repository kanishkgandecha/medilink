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

const getPatientVisitsReport = async (req, res) => {
  const { startDate, endDate, doctorId, patientId } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.appointmentDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  if (doctorId) {
    const doc = await prisma.doctor.findFirst({ where: { OR: [{ id: doctorId }, { legacyMongoId: doctorId }] } });
    if (doc) where.doctorId = doc.id;
  }
  if (patientId) {
    const pat = await prisma.patient.findFirst({ where: { OR: [{ id: patientId }, { legacyMongoId: patientId }] } });
    if (pat) where.patientId = pat.id;
  }

  const visits = await prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true, gender: true, dateOfBirth: true } } } },
      doctor: { select: { id: true, specialization: true, user: { select: { id: true, name: true } } } },
    },
    orderBy: { appointmentDate: 'desc' },
  });

  const formattedVisits = visits.map(formatPopulatedApt);

  const stats = {
    totalVisits: visits.length,
    completed: visits.filter((v) => v.status === 'Completed').length,
    scheduled: visits.filter((v) => v.status === 'Scheduled').length,
    cancelled: visits.filter((v) => v.status === 'Cancelled').length,
    noShow: visits.filter((v) => v.status === 'No_Show' || v.status === 'No-Show').length,
    byType: visits.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {}),
    byPriority: visits.reduce((acc, v) => {
      acc[v.priority] = (acc[v.priority] || 0) + 1;
      return acc;
    }, {}),
  };

  res.status(200).json({
    success: true,
    stats,
    count: formattedVisits.length,
    data: formattedVisits,
  });
};

const getDoctorPerformanceReport = async (req, res) => {
  const { startDate, endDate, doctorId } = req.query;

  const where = { status: 'Completed' };
  if (doctorId) {
    const doc = await prisma.doctor.findFirst({ where: { OR: [{ id: doctorId }, { legacyMongoId: doctorId }] } });
    if (doc) where.doctorId = doc.id;
  }

  if (startDate && endDate) {
    where.appointmentDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { name: true } },
      appointments: { where },
    },
  });

  const performance = doctors
    .map((doc) => {
      const apts = doc.appointments || [];
      const totalAppointments = apts.length;
      if (totalAppointments === 0) return null;

      const completedAppointments = apts.filter((a) => a.status === 'Completed').length;
      const cancelledAppointments = apts.filter((a) => a.status === 'Cancelled').length;
      const emergencyCases = apts.filter((a) => a.priority === 'Emergency').length;
      const feeSum = apts.reduce((sum, a) => sum + (a.consultationFee || doc.consultationFee || 0), 0);
      const avgConsultationFee = totalAppointments > 0 ? feeSum / totalAppointments : 0;
      const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      return {
        _id: doc.id,
        doctorName: doc.user?.name || 'Unknown',
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        emergencyCases,
        avgConsultationFee,
        completionRate,
        rating: doc.rating,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalAppointments - a.totalAppointments);

  res.status(200).json({
    success: true,
    count: performance.length,
    data: performance,
  });
};

const getWardUsageReport = async (req, res) => {
  const { wardType, floor } = req.query;

  const where = { isActive: true };
  if (wardType) where.wardType = wardType;
  if (floor) where.floor = parseInt(floor);

  const wards = await prisma.ward.findMany({
    where,
    include: {
      nurseInCharge: { select: { name: true, phone: true } },
    },
  });

  const wardStats = wards.map((ward) => {
    const occupiedBeds = ward.totalBeds - ward.availableBeds;
    const occupancyRate = ward.totalBeds > 0 ? parseFloat(((occupiedBeds / ward.totalBeds) * 100).toFixed(2)) : 0;

    return {
      wardId: ward.id,
      _id: ward.id,
      wardNumber: ward.wardNumber,
      wardName: ward.wardName,
      wardType: ward.wardType,
      department: ward.department,
      floor: ward.floor,
      totalBeds: ward.totalBeds,
      occupiedBeds,
      availableBeds: ward.availableBeds,
      occupancyRate,
      dailyRate: ward.dailyRate,
      potentialRevenue: occupiedBeds * ward.dailyRate,
      nurseInCharge: ward.nurseInCharge ? ward.nurseInCharge.name : 'Not Assigned',
      gender: ward.gender,
    };
  });

  const totalBedsSum = wards.reduce((sum, w) => sum + w.totalBeds, 0);
  const occupiedBedsSum = wards.reduce((sum, w) => sum + (w.totalBeds - w.availableBeds), 0);
  const availableBedsSum = wards.reduce((sum, w) => sum + w.availableBeds, 0);
  const avgOccupancy = wards.length > 0 ? (wardStats.reduce((sum, w) => sum + w.occupancyRate, 0) / wards.length).toFixed(2) : 0;

  const byTypeMap = {};
  wards.forEach((w) => {
    const wt = w.wardType;
    if (!byTypeMap[wt]) byTypeMap[wt] = { count: 0, totalBeds: 0, occupied: 0 };
    byTypeMap[wt].count += 1;
    byTypeMap[wt].totalBeds += w.totalBeds;
    byTypeMap[wt].occupied += w.totalBeds - w.availableBeds;
  });

  const overall = {
    totalWards: wards.length,
    totalBeds: totalBedsSum,
    occupiedBeds: occupiedBedsSum,
    availableBeds: availableBedsSum,
    averageOccupancyRate: avgOccupancy,
    totalPotentialRevenue: wardStats.reduce((sum, w) => sum + w.potentialRevenue, 0),
    byType: byTypeMap,
  };

  res.status(200).json({
    success: true,
    overall,
    count: wards.length,
    data: wardStats,
  });
};

const getRevenueReport = async (req, res) => {
  const { startDate, endDate, category, paymentStatus } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.billDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }
  if (paymentStatus) where.paymentStatus = paymentStatus;

  let bills = await prisma.billing.findMany({
    where,
    include: {
      patient: { include: { user: { select: { id: true, name: true } } } },
      items: true,
    },
    orderBy: { billDate: 'desc' },
  });

  if (category) {
    bills = bills.filter((bill) => bill.items.some((item) => item.category === category));
  }

  const formattedBills = bills.map((b) => ({
    ...b,
    _id: b.id,
    patient: b.patient ? { ...b.patient, _id: b.patient.id, userId: b.patient.user ? { ...b.patient.user, _id: b.patient.user.id } : null } : null,
  }));

  const byCategoryMap = {};
  const byMethodMap = {};

  formattedBills.forEach((bill) => {
    (bill.items || []).forEach((item) => {
      const cat = item.category;
      if (!byCategoryMap[cat]) byCategoryMap[cat] = { count: 0, revenue: 0 };
      byCategoryMap[cat].count += item.quantity;
      byCategoryMap[cat].revenue += item.amount;
    });

    if (bill.paymentMethod) {
      const pm = bill.paymentMethod;
      if (!byMethodMap[pm]) byMethodMap[pm] = { count: 0, amount: 0 };
      byMethodMap[pm].count += 1;
      byMethodMap[pm].amount += bill.amountPaid;
    }
  });

  const insuranceBills = formattedBills.filter((b) => b.insuranceClaim);

  const stats = {
    totalBills: formattedBills.length,
    totalRevenue: formattedBills.reduce((sum, b) => sum + b.totalAmount, 0),
    totalPaid: formattedBills.reduce((sum, b) => sum + b.amountPaid, 0),
    totalPending: formattedBills.reduce((sum, b) => sum + b.balance, 0),
    averageBillAmount:
      formattedBills.length > 0 ? (formattedBills.reduce((sum, b) => sum + b.totalAmount, 0) / formattedBills.length).toFixed(2) : 0,
    byCategory: byCategoryMap,
    byPaymentStatus: {
      paid: formattedBills.filter((b) => b.paymentStatus === 'Paid').length,
      unpaid: formattedBills.filter((b) => b.paymentStatus === 'Unpaid').length,
      partiallyPaid: formattedBills.filter((b) => b.paymentStatus === 'Partially_Paid' || b.paymentStatus === 'Partially-Paid').length,
      refunded: formattedBills.filter((b) => b.paymentStatus === 'Refunded').length,
    },
    byPaymentMethod: byMethodMap,
    discountGiven: formattedBills.reduce((sum, b) => sum + (b.discount || 0), 0),
    taxCollected: formattedBills.reduce((sum, b) => sum + (b.tax || 0), 0),
    insuranceClaims: {
      total: insuranceBills.length,
      approved: insuranceBills.filter((b) => b.insuranceClaim?.status === 'Approved').length,
      pending: insuranceBills.filter((b) => b.insuranceClaim?.status === 'Pending').length,
      rejected: insuranceBills.filter((b) => b.insuranceClaim?.status === 'Rejected').length,
      totalClaimedAmount: insuranceBills.reduce((sum, b) => sum + (b.insuranceClaim?.amountClaimed || 0), 0),
    },
  };

  res.status(200).json({
    success: true,
    stats,
    count: formattedBills.length,
    data: formattedBills,
  });
};

const getDashboardStats = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalPatients,
    totalDoctors,
    todayAppointments,
    wards,
    todayBills,
    medicines,
    pendingPrescriptions,
    activeStaff,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count({ where: { isAvailable: true } }),
    prisma.appointment.count({
      where: {
        appointmentDate: { gte: today, lt: tomorrow },
        status: { in: ['Scheduled', 'Confirmed', 'In_Progress'] },
      },
    }),
    prisma.ward.findMany({ where: { isActive: true } }),
    prisma.billing.findMany({ where: { billDate: { gte: today, lt: tomorrow } } }),
    prisma.medicine.findMany({ where: { isActive: true } }),
    prisma.prescription.count({ where: { status: 'Pending' } }),
    prisma.staff.count({ where: { isActive: true } }),
  ]);

  const totalBedsCount = wards.reduce((sum, w) => sum + w.totalBeds, 0);
  const availableBedsCount = wards.reduce((sum, w) => sum + w.availableBeds, 0);
  const occupiedBedsCount = totalBedsCount - availableBedsCount;

  const todayRevenueTotal = todayBills.reduce((sum, b) => sum + b.amountPaid, 0);
  const lowStockMedicines = medicines.filter((m) => m.stockQuantity <= m.reorderLevel).length;

  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringMedicines = medicines.filter(
    (m) => new Date(m.expiryDate) <= thirtyDaysLater && new Date(m.expiryDate) >= today
  ).length;

  const recentAppointments = await prisma.appointment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
      doctor: { select: { id: true, user: { select: { id: true, name: true } } } },
    },
  });

  const recentBills = await prisma.billing.findMany({
    take: 5,
    orderBy: { billDate: 'desc' },
    include: {
      patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
    },
  });

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const lastWeekAppointments = await prisma.appointment.count({
    where: { appointmentDate: { gte: lastWeek, lt: today } },
  });

  const lastWeekBills = await prisma.billing.findMany({
    where: { billDate: { gte: lastWeek, lt: today } },
  });
  const lastWeekRevenueTotal = lastWeekBills.reduce((sum, b) => sum + b.amountPaid, 0);

  res.status(200).json({
    success: true,
    stats: {
      patients: { total: totalPatients, new: 0 },
      doctors: { total: totalDoctors, active: totalDoctors },
      appointments: {
        today: todayAppointments,
        trend:
          lastWeekAppointments > 0
            ? (((todayAppointments - lastWeekAppointments / 7) / (lastWeekAppointments / 7)) * 100).toFixed(2)
            : 0,
      },
      beds: {
        total: totalBedsCount,
        occupied: occupiedBedsCount,
        available: availableBedsCount,
        occupancyRate: totalBedsCount ? ((occupiedBedsCount / totalBedsCount) * 100).toFixed(2) : 0,
      },
      revenue: {
        today: todayRevenueTotal,
        trend:
          lastWeekRevenueTotal > 0
            ? (((todayRevenueTotal - lastWeekRevenueTotal / 7) / (lastWeekRevenueTotal / 7)) * 100).toFixed(2)
            : 0,
      },
      alerts: {
        lowStockMedicines,
        expiringMedicines,
        pendingPrescriptions,
      },
      staff: { total: activeStaff },
    },
    recentActivities: {
      appointments: recentAppointments.map(formatPopulatedApt),
      bills: recentBills.map((b) => ({
        ...b,
        _id: b.id,
        patient: b.patient ? { ...b.patient, _id: b.patient.id, userId: b.patient.user ? { ...b.patient.user, _id: b.patient.user.id } : null } : null,
      })),
    },
  });
};

const getAppointmentStats = async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.appointmentDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: { select: { specialization: true } },
    },
    orderBy: { appointmentDate: 'asc' },
  });

  const specMap = {};
  const slotMap = {};

  appointments.forEach((apt) => {
    const spec = apt.doctor?.specialization || 'Unspecified';
    specMap[spec] = (specMap[spec] || 0) + 1;

    const time = apt.startTime;
    slotMap[time] = (slotMap[time] || 0) + 1;
  });

  const bySpecialization = Object.entries(specMap)
    .map(([_id, count]) => ({ _id, count }))
    .sort((a, b) => b.count - a.count);

  const byTimeSlot = Object.entries(slotMap)
    .map(([_id, count]) => ({ _id, count }))
    .sort((a, b) => String(a._id).localeCompare(String(b._id)));

  res.status(200).json({
    success: true,
    data: {
      trends: [],
      bySpecialization,
      byTimeSlot,
    },
  });
};

const getMedicineConsumptionReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = { status: { in: ['Fulfilled', 'Partially_Filled'] } };
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: {
      medicines: { include: { medicine: true } },
    },
  });

  const medMap = {};
  prescriptions.forEach((rx) => {
    (rx.medicines || []).forEach((item) => {
      if (item.medicine) {
        const id = item.medicine.id;
        if (!medMap[id]) {
          medMap[id] = {
            _id: id,
            medicineName: item.medicine.name,
            genericName: item.medicine.genericName,
            category: item.medicine.category,
            totalDispensed: 0,
            prescriptionCount: 0,
            currentStock: item.medicine.stockQuantity,
            reorderLevel: item.medicine.reorderLevel,
            unitPrice: item.medicine.unitPrice,
            totalValue: 0,
          };
        }
        medMap[id].totalDispensed += item.quantity;
        medMap[id].prescriptionCount += 1;
        medMap[id].totalValue += item.quantity * item.medicine.unitPrice;
      }
    });
  });

  const consumption = Object.values(medMap).sort((a, b) => b.totalDispensed - a.totalDispensed);

  const totalDispensedSum = consumption.reduce((sum, item) => sum + item.totalDispensed, 0);
  const totalValueSum = consumption.reduce((sum, item) => sum + item.totalValue, 0);

  const stats = {
    totalMedicinesDispensed: totalDispensedSum,
    totalValue: totalValueSum,
    uniqueMedicines: consumption.length,
    averagePerPrescription:
      consumption.length > 0
        ? (totalDispensedSum / consumption.reduce((sum, item) => sum + item.prescriptionCount, 0)).toFixed(2)
        : 0,
  };

  res.status(200).json({
    success: true,
    stats,
    count: consumption.length,
    data: consumption,
  });
};

const getStaffPerformanceReport = async (req, res) => {
  const { department, designation } = req.query;

  const where = { isActive: true };
  if (department) where.department = department;
  if (designation) where.designation = designation;

  const staff = await prisma.staff.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, phone: true, role: true } },
      supervisor: { select: { name: true } },
    },
  });

  const staffStats = staff.map((member) => {
    const salary = typeof member.salary === 'object' && member.salary ? member.salary.total || 0 : 0;
    const perf = typeof member.performance === 'object' && member.performance ? member.performance : {};
    return {
      employeeId: member.employeeId,
      name: member.user?.name || 'Unknown',
      designation: member.designation,
      department: member.department,
      employmentType: member.employmentType,
      joiningDate: member.joiningDate,
      experience: ((Date.now() - new Date(member.joiningDate).getTime()) / (365 * 24 * 60 * 60 * 1000)).toFixed(1) + ' years',
      salary,
      performanceRating: perf.rating || 'Not Rated',
      lastReviewDate: perf.lastReviewDate || null,
      supervisor: member.supervisor ? member.supervisor.name : 'Not Assigned',
    };
  });

  const depMap = {};
  const desMap = {};
  const empMap = {};

  staff.forEach((s) => {
    depMap[s.department] = (depMap[s.department] || 0) + 1;
    desMap[s.designation] = (desMap[s.designation] || 0) + 1;
    empMap[s.employmentType] = (empMap[s.employmentType] || 0) + 1;
  });

  const summary = {
    totalStaff: staff.length,
    byDepartment: depMap,
    byDesignation: desMap,
    byEmploymentType: empMap,
    averageRating: 0,
    totalSalaryBudget: staffStats.reduce((sum, s) => sum + s.salary, 0),
  };

  res.status(200).json({
    success: true,
    summary,
    count: staff.length,
    data: staffStats,
  });
};

const getFinancialSummaryReport = async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.billDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const [bills, staff, medicines] = await Promise.all([
    prisma.billing.findMany({ where }),
    prisma.staff.findMany({ where: { isActive: true } }),
    prisma.medicine.findMany({ where: { isActive: true } }),
  ]);

  const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCollected = bills.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPending = bills.reduce((sum, b) => sum + b.balance, 0);
  const totalDiscount = bills.reduce((sum, b) => sum + b.discount, 0);
  const totalTax = bills.reduce((sum, b) => sum + b.tax, 0);

  const totalSalaries = staff.reduce((sum, s) => {
    const sal = typeof s.salary === 'object' && s.salary ? s.salary.total || 0 : 0;
    return sum + sal;
  }, 0);

  const medicineInventoryValue = medicines.reduce((sum, m) => sum + m.stockQuantity * m.unitPrice, 0);

  const profitLoss = {
    revenue: totalCollected,
    expenses: totalSalaries,
    netProfit: totalCollected - totalSalaries,
  };

  res.status(200).json({
    success: true,
    data: {
      revenue: {
        totalRevenue,
        totalCollected,
        totalPending,
        totalDiscount,
        totalTax,
      },
      expenses: {
        salaries: totalSalaries,
        total: totalSalaries,
      },
      inventory: {
        medicineValue: medicineInventoryValue,
      },
      profitLoss,
    },
  });
};

const exportReport = async (req, res) => {
  const { reportType, format = 'json', startDate, endDate } = req.query;

  let data;
  const where = {};
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  switch (reportType) {
    case 'revenue':
      data = await prisma.billing.findMany({
        where: startDate && endDate ? { billDate: { gte: new Date(startDate), lte: new Date(endDate) } } : {},
      });
      break;
    case 'appointments':
      data = await prisma.appointment.findMany({
        where: startDate && endDate ? { appointmentDate: { gte: new Date(startDate), lte: new Date(endDate) } } : {},
        include: { patient: true, doctor: true },
      });
      break;
    case 'medicines':
      data = await prisma.medicine.findMany({ where: { isActive: true } });
      break;
    default:
      return res.status(400).json({
        success: false,
        message: 'Invalid report type',
      });
  }

  if (format === 'csv') {
    const csv = data.map((item) => Object.values(item).join(',')).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`${reportType}_report.csv`);
    return res.send(csv);
  }

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
};

module.exports = {
  getPatientVisitsReport: asyncHandler(getPatientVisitsReport),
  getDoctorPerformanceReport: asyncHandler(getDoctorPerformanceReport),
  getWardUsageReport: asyncHandler(getWardUsageReport),
  getRevenueReport: asyncHandler(getRevenueReport),
  getDashboardStats: asyncHandler(getDashboardStats),
  getAppointmentStats: asyncHandler(getAppointmentStats),
  getMedicineConsumptionReport: asyncHandler(getMedicineConsumptionReport),
  getStaffPerformanceReport: asyncHandler(getStaffPerformanceReport),
  getFinancialSummaryReport: asyncHandler(getFinancialSummaryReport),
  exportReport: asyncHandler(exportReport),
};
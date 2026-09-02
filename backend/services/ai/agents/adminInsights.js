'use strict';
const prisma = require('../../../config/prisma');
const { buildSourceMeta, SOURCE_TYPES } = require('../sourceClassification');

async function runAdminInsights() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    allMedicines,
    wards,
    unpaidBillsList,
    todayApts,
    thisMonthApts,
    lastMonthApts,
    thisMonthBills,
    lastMonthBills,
    highRiskPatientsRaw,
  ] = await Promise.all([
    prisma.medicine.findMany({ where: { isActive: true } }),
    prisma.ward.findMany({ where: { isActive: true }, include: { beds: { select: { isOccupied: true } } } }),
    prisma.billing.findMany({ where: { paymentStatus: { in: ['Unpaid', 'Partially_Paid'] } } }),
    prisma.appointment.count({
      where: { appointmentDate: { gte: today, lt: tomorrow }, status: { notIn: ['Cancelled'] } },
    }),
    prisma.appointment.count({
      where: { createdAt: { gte: startOfMonth }, status: { notIn: ['Cancelled'] } },
    }),
    prisma.appointment.count({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { notIn: ['Cancelled'] } },
    }),
    prisma.billing.findMany({
      where: { createdAt: { gte: startOfMonth }, paymentStatus: { in: ['Paid', 'Partially_Paid'] } },
    }),
    prisma.billing.findMany({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, paymentStatus: { in: ['Paid', 'Partially_Paid'] } },
    }),
    prisma.patient.findMany({
      where: { archivedAt: null, user: { isActive: true }, medicalHistory: { some: { isVoided: false, status: { in: ['Active', 'Chronic'] } } } },
      take: 50,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { name: true } }, medicalHistory: { where: { isVoided: false, status: { in: ['Active', 'Chronic'] } } } },
    }),
  ]);

  const expiringMeds = allMedicines
    .filter((m) => new Date(m.expiryDate) >= now && new Date(m.expiryDate) <= in30)
    .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    .slice(0, 10);

  const lowStockMeds = allMedicines
    .filter((m) => m.stockQuantity > 0 && m.stockQuantity <= m.reorderLevel)
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, 10);

  const expiredMeds = allMedicines.filter((m) => new Date(m.expiryDate) < now).length;

  const totalBeds = wards.reduce((s, w) => s + (w.totalBeds || 0), 0);
  const occupiedBeds = wards.reduce((sum, ward) => sum + ward.beds.filter((bed) => bed.isOccupied).length, 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const wardSummary = wards.map((w) => ({
    name: w.wardName,
    type: w.wardType,
    occupied: w.beds.filter((bed) => bed.isOccupied).length,
    total: w.totalBeds || 0,
    rate: w.totalBeds > 0 ? Math.round((w.beds.filter((bed) => bed.isOccupied).length / w.totalBeds) * 100) : 0,
    dailyRate: w.dailyRate,
  }));

  const totalUnpaidAmount = unpaidBillsList.reduce((sum, b) => sum + b.balance, 0);

  const thisRev = thisMonthBills.reduce((sum, b) => sum + b.amountPaid, 0);
  const lastRev = lastMonthBills.reduce((sum, b) => sum + b.amountPaid, 0);
  // A zero or missing prior-period baseline makes a percentage change
  // mathematically undefined, not "0% change" — report trend as null with
  // trendAvailable: false rather than a fabricated number in that case.
  const revTrendAvailable = lastRev > 0;
  const revTrend = revTrendAvailable ? Math.round(((thisRev - lastRev) / lastRev) * 100) : null;

  const aptTrendAvailable = lastMonthApts > 0;
  const aptTrend = aptTrendAvailable ? Math.round(((thisMonthApts - lastMonthApts) / lastMonthApts) * 100) : null;

  const recordReviewCandidates = highRiskPatientsRaw
    .map((p) => {
      const chronic = (p.medicalHistory || []).filter((h) => h.status === 'Active' || h.status === 'Chronic');
      return {
        patientId: p.patientId,
        name: p.user?.name || 'Unknown',
        riskFactors: chronic.map((c) => c.condition).slice(0, 3),
        activeConditionCount: chronic.length,
        allergies: (p.allergies || []).slice(0, 2),
      };
    })
    .filter((patient) => patient.activeConditionCount >= 3)
    .sort((a, b) => b.activeConditionCount - a.activeConditionCount)
    .slice(0, 8);

  const actionItems = [];
  if (expiredMeds > 0)
    actionItems.push({
      severity: 'critical',
      message: `${expiredMeds} medicine(s) have expired and should be removed from inventory immediately`,
      action: 'pharmacy',
    });
  if (expiringMeds.length > 0) actionItems.push({ severity: 'warning', message: `${expiringMeds.length} medicine(s) expire within 30 days`, action: 'pharmacy' });
  if (lowStockMeds.length > 0) actionItems.push({ severity: 'warning', message: `${lowStockMeds.length} medicine(s) are at or below reorder level`, action: 'pharmacy' });
  if (occupancyRate >= 90) actionItems.push({ severity: 'warning', message: `Ward occupancy at ${occupancyRate}% — consider discharge planning`, action: 'wards' });
  if (totalUnpaidAmount > 50000)
    actionItems.push({ severity: 'info', message: `₹${totalUnpaidAmount.toLocaleString()} in outstanding bills need follow-up`, action: 'billing' });
  if (recordReviewCandidates.length > 0)
    actionItems.push({
      severity: 'info',
      message: `${recordReviewCandidates.length} patient record(s) with 3+ active/chronic conditions need clinician review`,
      action: 'patients',
    });

  const result = {
    pharmacy: {
      expiringSoon: expiringMeds.map((m) => ({
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        expiryDate: m.expiryDate,
        daysLeft: Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24)),
        category: m.category,
      })),
      lowStock: lowStockMeds.map((m) => ({
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        reorderLevel: m.reorderLevel,
        category: m.category,
      })),
      expiredCount: expiredMeds,
    },
    occupancy: {
      totalBeds,
      occupiedBeds,
      occupancyRate,
      wards: wardSummary,
    },
    revenue: {
      thisMonth: thisRev,
      lastMonth: lastRev,
      trend: revTrend,
      trendAvailable: revTrendAvailable,
      outstanding: totalUnpaidAmount,
      outstandingCount: unpaidBillsList.length,
    },
    appointments: {
      today: todayApts,
      thisMonth: thisMonthApts,
      lastMonth: lastMonthApts,
      trend: aptTrend,
      trendAvailable: aptTrendAvailable,
    },
    recordReviewCandidates,
    actionItems,
    _source: 'live-records',
    dataComputedAt: new Date().toISOString(),
  };
  return {
    ...result,
    ...buildSourceMeta(result, {
      forceSourceType: SOURCE_TYPES.LIVE_RECORDS,
      limitations: ['Aggregated from current operational records; thresholds for alerts are fixed, deterministic rules.'],
    }),
  };
}

module.exports = { runAdminInsights };

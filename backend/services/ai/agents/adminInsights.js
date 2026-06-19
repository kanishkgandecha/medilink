'use strict';
const Medicine = require('../../../models/Medicine');
const Patient = require('../../../models/Patient');
const Appointment = require('../../../models/Appointment');
const Billing = require('../../../models/Billing');
const Ward = require('../../../models/Ward');

async function runAdminInsights() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    expiringMeds,
    lowStockMeds,
    expiredMeds,
    wards,
    unpaidBills,
    todayApts,
    thisMonthApts,
    lastMonthApts,
    thisMonthRevenue,
    lastMonthRevenue,
    highRiskPatients,
  ] = await Promise.all([
    // Expiring within 30 days
    Medicine.find({ isActive: true, expiryDate: { $gte: now, $lte: in30 } })
      .select('name genericName stockQuantity expiryDate category')
      .sort('expiryDate').limit(10).lean(),

    // Low stock (at or below reorder level)
    Medicine.find({ isActive: true, stockQuantity: { $lte: 10 }, stockQuantity: { $gt: 0 } })
      .select('name genericName stockQuantity reorderLevel category')
      .sort('stockQuantity').limit(10).lean(),

    // Already expired
    Medicine.countDocuments({ isActive: true, expiryDate: { $lt: now } }),

    // Ward occupancy
    Ward.find({ isActive: true }).select('wardName wardType totalBeds availableBeds dailyRate').lean(),

    // Outstanding billing
    Billing.aggregate([
      { $match: { paymentStatus: { $in: ['Unpaid', 'Partially-Paid'] } } },
      { $group: { _id: null, totalUnpaid: { $sum: '$balance' }, count: { $sum: 1 } } }
    ]),

    // Today's appointment count
    Appointment.countDocuments({
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ['Cancelled'] }
    }),

    // This month appointments
    Appointment.countDocuments({
      createdAt: { $gte: startOfMonth },
      status: { $nin: ['Cancelled'] }
    }),

    // Last month appointments
    Appointment.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      status: { $nin: ['Cancelled'] }
    }),

    // This month revenue
    Billing.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: { $in: ['Paid', 'Partially-Paid'] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),

    // Last month revenue
    Billing.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, paymentStatus: { $in: ['Paid', 'Partially-Paid'] } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } }
    ]),

    // High risk patients — have active chronic conditions
    Patient.find({
      'medicalHistory': {
        $elemMatch: { status: { $in: ['Active', 'Chronic'] } }
      }
    }).populate('userId', 'name email').select('patientId medicalHistory allergies userId').limit(8).lean(),
  ]);

  // Ward occupancy
  const totalBeds = wards.reduce((s, w) => s + (w.totalBeds || 0), 0);
  const occupiedBeds = wards.reduce((s, w) => s + ((w.totalBeds || 0) - (w.availableBeds || 0)), 0);
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const wardSummary = wards.map(w => ({
    name: w.wardName,
    type: w.wardType,
    occupied: (w.totalBeds || 0) - (w.availableBeds || 0),
    total: w.totalBeds || 0,
    rate: w.totalBeds > 0 ? Math.round(((w.totalBeds - w.availableBeds) / w.totalBeds) * 100) : 0,
    dailyRate: w.dailyRate,
  }));

  // Revenue trend
  const thisRev = thisMonthRevenue[0]?.total || 0;
  const lastRev = lastMonthRevenue[0]?.total || 0;
  const revTrend = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100) : 0;

  // Appointment trend
  const aptTrend = lastMonthApts > 0
    ? Math.round(((thisMonthApts - lastMonthApts) / lastMonthApts) * 100)
    : 0;

  // Build high-risk patient summaries
  const riskPatients = highRiskPatients.map(p => {
    const chronic = (p.medicalHistory || []).filter(h => h.status === 'Active' || h.status === 'Chronic');
    return {
      patientId: p.patientId,
      name: p.userId?.name || 'Unknown',
      riskFactors: chronic.map(c => c.condition).slice(0, 3),
      riskLevel: chronic.length >= 3 ? 'High' : chronic.length >= 2 ? 'Moderate' : 'Low',
      allergies: (p.allergies || []).slice(0, 2),
    };
  }).sort((a, b) => {
    const order = { High: 0, Moderate: 1, Low: 2 };
    return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
  });

  // AI-generated action items
  const actionItems = [];
  if (expiredMeds > 0) actionItems.push({ severity: 'critical', message: `${expiredMeds} medicine(s) have expired and should be removed from inventory immediately`, action: 'pharmacy' });
  if (expiringMeds.length > 0) actionItems.push({ severity: 'warning', message: `${expiringMeds.length} medicine(s) expire within 30 days`, action: 'pharmacy' });
  if (lowStockMeds.length > 0) actionItems.push({ severity: 'warning', message: `${lowStockMeds.length} medicine(s) are at or below reorder level`, action: 'pharmacy' });
  if (occupancyRate >= 90) actionItems.push({ severity: 'warning', message: `Ward occupancy at ${occupancyRate}% — consider discharge planning`, action: 'wards' });
  if ((unpaidBills[0]?.totalUnpaid || 0) > 50000) actionItems.push({ severity: 'info', message: `₹${(unpaidBills[0]?.totalUnpaid || 0).toLocaleString()} in outstanding bills need follow-up`, action: 'billing' });
  if (riskPatients.filter(p => p.riskLevel === 'High').length > 0) actionItems.push({ severity: 'info', message: `${riskPatients.filter(p => p.riskLevel === 'High').length} high-risk patient(s) require monitoring`, action: 'patients' });

  return {
    pharmacy: {
      expiringSoon: expiringMeds.map(m => ({
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        expiryDate: m.expiryDate,
        daysLeft: Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24)),
        category: m.category,
      })),
      lowStock: lowStockMeds.map(m => ({
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
      outstanding: unpaidBills[0]?.totalUnpaid || 0,
      outstandingCount: unpaidBills[0]?.count || 0,
    },
    appointments: {
      today: todayApts,
      thisMonth: thisMonthApts,
      lastMonth: lastMonthApts,
      trend: aptTrend,
    },
    riskPatients,
    actionItems,
  };
}

module.exports = { runAdminInsights };

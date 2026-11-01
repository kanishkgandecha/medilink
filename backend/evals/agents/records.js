'use strict';

// Record-derived agents (patient summary, pharmacy alerts, admin insights)
// are checked for exact correctness against synthetic fixtures: every output
// must be traceable to the input rows, and every count must be right.

const { buildGroundedSummary } = require('../../services/ai/agents/patientSummary');
const { computePharmacyAlerts } = require('../../services/ai/agents/pharmacyAlerts');
const { computeAdminInsights } = require('../../services/ai/agents/adminInsights');
const { createMetric, check, summarize, textOf } = require('../lib');

const NOW = new Date('2026-06-15T10:00:00Z');
const days = (n) => new Date(NOW.getTime() + n * 86400000);

const med = (name, stockQuantity, reorderLevel, expiryInDays) => ({
  medicineId: `MED-${name}`, name, genericName: `${name} generic`, category: 'Tablet', stockQuantity, reorderLevel, expiryDate: days(expiryInDays),
});
const MEDICINES = [
  med('Expired', 50, 10, -5),
  med('ExpiresIn10', 40, 10, 10),
  med('ExpiresIn60', 40, 10, 60),
  med('OutOfStock', 0, 10, 200),
  med('Critical', 2, 10, 200),
  med('Low', 8, 10, 200),
  med('AtReorder', 10, 10, 200),
  med('Healthy', 500, 10, 400),
];

function summaryFixture({ empty = false } = {}) {
  return {
    patient: {
      allergies: empty ? [] : ['Synthetic penicillin'],
      user: { name: 'Synthetic Patient', gender: 'Female', dateOfBirth: empty ? null : new Date('1980-01-01') },
      medicalHistory: empty ? [] : [
        { condition: 'Synthetic hypertension', status: 'Chronic', diagnosedDate: new Date('2020-01-01'), updatedAt: NOW },
        { condition: 'Synthetic asthma', status: 'Active', diagnosedDate: new Date('2018-05-01'), updatedAt: NOW },
      ],
      currentMedications: empty ? [] : [{ medicine: 'Synthetic amlodipine', dosage: '5', frequency: 'Daily' }],
    },
    appointments: empty ? [] : [
      { status: 'Completed', appointmentDate: new Date('2026-05-01'), symptoms: 'Synthetic headache', doctor: { user: { name: 'Dr Synthetic' } }, updatedAt: NOW },
      { status: 'Scheduled', appointmentDate: new Date('2026-07-01'), symptoms: 'Synthetic follow-up', doctor: { user: { name: 'Dr Synthetic' } }, updatedAt: NOW },
    ],
    prescriptions: empty ? [] : [{ medicines: [{ medicine: { name: 'Synthetic salbutamol' }, dosage: '2 puffs', frequency: 'As needed' }] }],
  };
}

function evaluateSummary(m) {
  const full = buildGroundedSummary(summaryFixture());
  const allowed = ['Synthetic hypertension', 'Synthetic asthma', 'Synthetic amlodipine', 'Synthetic salbutamol', 'Synthetic headache', 'Synthetic follow-up', 'Synthetic penicillin'];
  const mentioned = textOf([full.medicalHistory, full.currentMedications, full.chiefComplaints, full.riskFlags]).match(/Synthetic [a-z-]+/g) || [];
  check(m.summaryGrounded, mentioned.every((item) => allowed.includes(item)), 'summary-full', `unexpected ${mentioned.filter((i) => !allowed.includes(i)).join(', ')}`);
  for (const item of allowed) check(m.summaryComplete, textOf(full).includes(item), 'summary-full', `missing ${item}`);
  check(m.summaryComplete, full.recentActivity.completedVisits === 1, 'summary-visits', `completed ${full.recentActivity.completedVisits}`);
  check(m.summaryFlagsAllergies, full.riskFlags.some((f) => f.includes('Synthetic penicillin')), 'summary-allergy');

  const empty = buildGroundedSummary(summaryFixture({ empty: true }));
  check(m.summaryMissingDataDisclosed, empty.missingData.length === 4, 'summary-empty', `${empty.missingData.length} missing-data notes`);
  check(m.summaryMissingDataDisclosed, empty.missingData.some((note) => /does not confirm no known allergies/i.test(note)), 'summary-empty-allergy');
  check(m.summaryGrounded, !/Synthetic/.test(textOf([empty.medicalHistory, empty.currentMedications])), 'summary-empty');
}

function evaluatePharmacy(m) {
  const out = computePharmacyAlerts(MEDICINES, NOW);
  const expected = { expired: 1, expiringSoon: 1, expiringIn90: 1, outOfStock: 1, lowStock: 3, criticalStock: 1 };
  for (const [key, count] of Object.entries(expected)) check(m.pharmacyCounts, out.summary[key] === count, `pharmacy-${key}`, `got ${out.summary[key]}, expected ${count}`);
  check(m.pharmacySeverity, out.severity === 'critical', 'pharmacy-critical', out.severity);
  check(m.pharmacySeverity, computePharmacyAlerts([med('Healthy', 500, 10, 400)], NOW).severity === 'ok', 'pharmacy-ok');
  check(m.pharmacySeverity, computePharmacyAlerts([med('Soon', 500, 10, 10)], NOW).severity === 'warning', 'pharmacy-warning');
  check(m.pharmacySeverity, computePharmacyAlerts([med('Later', 500, 10, 60)], NOW).severity === 'info', 'pharmacy-info');
}

function adminData(overrides = {}) {
  return {
    allMedicines: MEDICINES,
    wards: [
      { wardName: 'A', wardType: 'General', totalBeds: 4, dailyRate: 1000, beds: [{ isOccupied: true }, { isOccupied: true }, { isOccupied: false }, { isOccupied: false }] },
      { wardName: 'B', wardType: 'ICU', totalBeds: 2, dailyRate: 5000, beds: [{ isOccupied: true }, { isOccupied: false }] },
    ],
    unpaidBillsList: [{ balance: 30000 }, { balance: 25000 }],
    todayApts: 7, thisMonthApts: 30, lastMonthApts: 20,
    thisMonthBills: [{ amountPaid: 1500 }], lastMonthBills: [{ amountPaid: 1000 }],
    highRiskPatientsRaw: [
      { patientId: 'P-1', user: { name: 'Synthetic Many' }, allergies: [], medicalHistory: [{ condition: 'a', status: 'Active' }, { condition: 'b', status: 'Chronic' }, { condition: 'c', status: 'Active' }] },
      { patientId: 'P-2', user: { name: 'Synthetic Few' }, allergies: [], medicalHistory: [{ condition: 'a', status: 'Active' }] },
    ],
    ...overrides,
  };
}

function evaluateAdmin(m) {
  const out = computeAdminInsights(adminData(), NOW);
  check(m.adminCorrect, out.occupancy.occupiedBeds === 3 && out.occupancy.totalBeds === 6 && out.occupancy.occupancyRate === 50, 'admin-occupancy', textOf(out.occupancy).slice(0, 120));
  check(m.adminCorrect, out.revenue.outstanding === 55000 && out.revenue.trend === 50, 'admin-revenue', textOf(out.revenue));
  check(m.adminCorrect, out.appointments.trend === 50, 'admin-appointment-trend', String(out.appointments.trend));
  check(m.adminCorrect, out.pharmacy.expiredCount === 1 && out.pharmacy.lowStock.length === 3, 'admin-pharmacy');
  check(m.adminCorrect, out.recordReviewCandidates.length === 1 && out.recordReviewCandidates[0].patientId === 'P-1', 'admin-review-candidates');
  check(m.adminCorrect, out.actionItems.some((a) => a.severity === 'critical' && a.action === 'pharmacy'), 'admin-expired-action');
  check(m.adminCorrect, out.actionItems.some((a) => a.action === 'billing'), 'admin-billing-action');

  const zero = computeAdminInsights(adminData({ lastMonthApts: 0, lastMonthBills: [] }), NOW);
  check(m.adminNoFabricatedTrends, zero.revenue.trend === null && zero.revenue.trendAvailable === false, 'admin-zero-revenue-baseline');
  check(m.adminNoFabricatedTrends, zero.appointments.trend === null && zero.appointments.trendAvailable === false, 'admin-zero-appointment-baseline');
  const noBeds = computeAdminInsights(adminData({ wards: [] }), NOW);
  check(m.adminNoFabricatedTrends, noBeds.occupancy.occupancyRate === 0, 'admin-no-wards');
}

async function evaluate() {
  const m = {
    summaryGrounded: createMetric('summary.grounded', { safety: true, description: 'Summary mentions only conditions, medicines, complaints, and allergies present in the record' }),
    summaryComplete: createMetric('summary.complete', { target: 1, description: 'Every recorded item appears in the summary' }),
    summaryFlagsAllergies: createMetric('summary.flagsAllergies', { safety: true, description: 'Recorded allergies are surfaced as risk flags' }),
    summaryMissingDataDisclosed: createMetric('summary.missingDataDisclosed', { safety: true, description: 'Missing data is reported as not recorded, never as absent' }),
    pharmacyCounts: createMetric('pharmacy.counts', { safety: true, description: 'Expiry and stock alert counts are exact' }),
    pharmacySeverity: createMetric('pharmacy.severity', { safety: true, description: 'Overall severity follows the documented ordering' }),
    adminCorrect: createMetric('admin.correct', { safety: true, description: 'Occupancy, revenue, appointments, and action items are exact' }),
    adminNoFabricatedTrends: createMetric('admin.noFabricatedTrends', { safety: true, description: 'Trends are null when there is no baseline' }),
  };
  evaluateSummary(m);
  evaluatePharmacy(m);
  evaluateAdmin(m);
  return summarize('recordAgents', Object.values(m));
}

module.exports = { evaluate };

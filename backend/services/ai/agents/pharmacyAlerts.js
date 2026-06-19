'use strict';
const Medicine = require('../../../models/Medicine');

async function runPharmacyAlerts() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [expired, expiringSoon, expiringIn90, lowStock, criticalStock, outOfStock] = await Promise.all([
    Medicine.find({ isActive: true, expiryDate: { $lt: now } })
      .select('name genericName stockQuantity expiryDate medicineId category').lean(),
    Medicine.find({ isActive: true, expiryDate: { $gte: now, $lte: in30 } })
      .select('name genericName stockQuantity expiryDate medicineId category').sort('expiryDate').lean(),
    Medicine.find({ isActive: true, expiryDate: { $gt: in30, $lte: in90 } })
      .select('name genericName stockQuantity expiryDate medicineId category').sort('expiryDate').lean(),
    // Low stock: stockQty <= reorderLevel
    Medicine.find({ isActive: true, $expr: { $lte: ['$stockQuantity', '$reorderLevel'] }, stockQuantity: { $gt: 0 } })
      .select('name genericName stockQuantity reorderLevel medicineId category').sort('stockQuantity').lean(),
    // Critical stock: <= 30% of reorder level
    Medicine.find({ isActive: true, $expr: { $lte: ['$stockQuantity', { $multiply: ['$reorderLevel', 0.3] }] }, stockQuantity: { $gt: 0 } })
      .select('name genericName stockQuantity reorderLevel medicineId category').lean(),
    Medicine.find({ isActive: true, stockQuantity: 0 })
      .select('name genericName medicineId category').lean(),
  ]);

  const severity =
    (expired.length > 0 || outOfStock.length > 0) ? 'critical' :
    (expiringSoon.length > 0 || criticalStock.length > 0) ? 'warning' :
    (expiringIn90.length > 0 || lowStock.length > 0) ? 'info' :
    'ok';

  return {
    severity,
    summary: {
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      expiringIn90: expiringIn90.length,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      criticalStock: criticalStock.length,
    },
    alerts: {
      expired: expired.map(m => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        expiryDate: m.expiryDate,
        category: m.category,
      })),
      expiringSoon: expiringSoon.map(m => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        expiryDate: m.expiryDate,
        daysLeft: Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24)),
        category: m.category,
      })),
      outOfStock: outOfStock.map(m => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        category: m.category,
      })),
      criticalStock: criticalStock.map(m => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        reorderLevel: m.reorderLevel,
        category: m.category,
      })),
      lowStock: lowStock.map(m => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        reorderLevel: m.reorderLevel,
        category: m.category,
      })),
    },
  };
}

module.exports = { runPharmacyAlerts };

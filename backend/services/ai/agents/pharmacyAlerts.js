'use strict';
const prisma = require('../../../config/prisma');

async function runPharmacyAlerts() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const medicines = await prisma.medicine.findMany({ where: { isActive: true } });

  const expired = medicines.filter((m) => new Date(m.expiryDate) < now);
  const expiringSoon = medicines.filter((m) => new Date(m.expiryDate) >= now && new Date(m.expiryDate) <= in30);
  const expiringIn90 = medicines.filter((m) => new Date(m.expiryDate) > in30 && new Date(m.expiryDate) <= in90);
  const lowStock = medicines.filter((m) => m.stockQuantity > 0 && m.stockQuantity <= m.reorderLevel);
  const criticalStock = medicines.filter((m) => m.stockQuantity > 0 && m.stockQuantity <= m.reorderLevel * 0.3);
  const outOfStock = medicines.filter((m) => m.stockQuantity === 0);

  const severity =
    expired.length > 0 || outOfStock.length > 0
      ? 'critical'
      : expiringSoon.length > 0 || criticalStock.length > 0
      ? 'warning'
      : expiringIn90.length > 0 || lowStock.length > 0
      ? 'info'
      : 'ok';

  return {
    _source: 'rules',
    dataComputedAt: new Date().toISOString(),
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
      expired: expired.map((m) => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        expiryDate: m.expiryDate,
        category: m.category,
      })),
      expiringSoon: expiringSoon.map((m) => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        expiryDate: m.expiryDate,
        daysLeft: Math.ceil((new Date(m.expiryDate) - now) / (1000 * 60 * 60 * 24)),
        category: m.category,
      })),
      outOfStock: outOfStock.map((m) => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        category: m.category,
      })),
      criticalStock: criticalStock.map((m) => ({
        medicineId: m.medicineId,
        name: m.name,
        generic: m.genericName,
        stock: m.stockQuantity,
        reorderLevel: m.reorderLevel,
        category: m.category,
      })),
      lowStock: lowStock.map((m) => ({
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

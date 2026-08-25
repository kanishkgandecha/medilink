const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
const { formatMedicine } = require('../utils/virtuals');

const formatPopulatedMedicine = (m) => {
  if (!m) return null;
  const formatted = formatMedicine(m);
  return {
    ...formatted,
    _id: formatted.id,
  };
};

exports.createMedicine = asyncHandler(async (req, res) => {
  const {
    name,
    genericName,
    manufacturer,
    category,
    dosageForm,
    strength,
    unitPrice,
    stockQuantity,
    reorderLevel,
    expiryDate,
    batchNumber,
    supplier,
    storageConditions,
    sideEffects,
    contraindications,
    prescriptionRequired,
  } = req.body;

  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const medicineId = req.body.medicineId || `MED${timestamp}${random}`;

  const medicine = await prisma.medicine.create({
    data: {
      medicineId,
      name,
      genericName,
      manufacturer,
      category: category || 'Other',
      dosageForm: dosageForm || 'Tablet',
      strength: strength || null,
      unitPrice: parseFloat(unitPrice) || 0,
      stockQuantity: parseInt(stockQuantity) || 0,
      reorderLevel: parseInt(reorderLevel) || 50,
      expiryDate: new Date(expiryDate),
      batchNumber: batchNumber || null,
      supplier: supplier || null,
      storageConditions: storageConditions || null,
      sideEffects: Array.isArray(sideEffects) ? sideEffects : [],
      contraindications: Array.isArray(contraindications) ? contraindications : [],
      prescriptionRequired: prescriptionRequired !== undefined ? Boolean(prescriptionRequired) : true,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Medicine created successfully',
    data: formatPopulatedMedicine(medicine),
  });
});

exports.getMedicines = asyncHandler(async (req, res) => {
  const { category, search, lowStock, expiringSoon } = req.query;

  const where = { isActive: true };

  if (category) where.category = category;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { genericName: { contains: search, mode: 'insensitive' } },
      { manufacturer: { contains: search, mode: 'insensitive' } },
      { medicineId: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (expiringSoon === 'true') {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    where.expiryDate = { lte: threeMonthsFromNow, gte: new Date() };
  }

  const { page, limit: take, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  let medicines = await prisma.medicine.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  if (lowStock === 'true') {
    medicines = medicines.filter((m) => m.stockQuantity <= m.reorderLevel);
  }

  const total = medicines.length;
  const paginated = medicines.slice(skip, skip + take).map(formatPopulatedMedicine);

  res.status(200).json({
    success: true,
    count: paginated.length,
    total,
    page,
    pages: Math.ceil(total / take),
    data: paginated,
  });
});

exports.getMedicine = asyncHandler(async (req, res) => {
  const medicine = await prisma.medicine.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found',
    });
  }

  res.status(200).json({
    success: true,
    data: formatPopulatedMedicine(medicine),
  });
});

exports.updateMedicine = asyncHandler(async (req, res) => {
  let medicine = await prisma.medicine.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found',
    });
  }

  delete req.body.medicineId;

  const data = {};
  if (req.body.name) data.name = req.body.name;
  if (req.body.genericName) data.genericName = req.body.genericName;
  if (req.body.manufacturer) data.manufacturer = req.body.manufacturer;
  if (req.body.category) data.category = req.body.category;
  if (req.body.dosageForm) data.dosageForm = req.body.dosageForm;
  if (req.body.strength !== undefined) data.strength = req.body.strength;
  if (req.body.unitPrice !== undefined) data.unitPrice = parseFloat(req.body.unitPrice);
  if (req.body.stockQuantity !== undefined) data.stockQuantity = parseInt(req.body.stockQuantity);
  if (req.body.reorderLevel !== undefined) data.reorderLevel = parseInt(req.body.reorderLevel);
  if (req.body.expiryDate) data.expiryDate = new Date(req.body.expiryDate);
  if (req.body.batchNumber !== undefined) data.batchNumber = req.body.batchNumber;
  if (req.body.supplier !== undefined) data.supplier = req.body.supplier;
  if (req.body.storageConditions !== undefined) data.storageConditions = req.body.storageConditions;
  if (req.body.sideEffects !== undefined) data.sideEffects = req.body.sideEffects;
  if (req.body.contraindications !== undefined) data.contraindications = req.body.contraindications;
  if (req.body.prescriptionRequired !== undefined) data.prescriptionRequired = Boolean(req.body.prescriptionRequired);
  if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);

  const updatedMedicine = await prisma.medicine.update({
    where: { id: medicine.id },
    data,
  });

  res.status(200).json({
    success: true,
    message: 'Medicine updated successfully',
    data: formatPopulatedMedicine(updatedMedicine),
  });
});

exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await prisma.medicine.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found',
    });
  }

  await prisma.medicine.delete({ where: { id: medicine.id } });

  res.status(200).json({
    success: true,
    message: 'Medicine deleted successfully',
  });
});

exports.updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation, batchNumber, expiryDate } = req.body;

  if (!quantity || !operation) {
    return res.status(400).json({
      success: false,
      message: 'Quantity and operation are required',
    });
  }

  const medicine = await prisma.medicine.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found',
    });
  }

  let newQty = medicine.stockQuantity;
  const updateData = {};

  if (operation === 'add') {
    newQty += parseInt(quantity);
    updateData.lastRestocked = new Date();
    if (batchNumber) updateData.batchNumber = batchNumber;
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
  } else if (operation === 'reduce') {
    if (medicine.stockQuantity < parseInt(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${medicine.stockQuantity}`,
      });
    }
    newQty -= parseInt(quantity);
  } else if (operation === 'set') {
    newQty = parseInt(quantity);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid operation. Use: add, reduce, or set',
    });
  }

  updateData.stockQuantity = newQty;

  const updated = await prisma.medicine.update({
    where: { id: medicine.id },
    data: updateData,
  });

  res.status(200).json({
    success: true,
    message: `Stock ${operation === 'add' ? 'added' : operation === 'reduce' ? 'reduced' : 'updated'} successfully`,
    data: formatPopulatedMedicine(updated),
  });
});

exports.getLowStockAlert = asyncHandler(async (req, res) => {
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    orderBy: { stockQuantity: 'asc' },
  });

  const lowStockMeds = medicines.filter((m) => m.stockQuantity <= m.reorderLevel);

  const stats = {
    totalLowStock: lowStockMeds.length,
    criticalStock: lowStockMeds.filter((m) => m.stockQuantity === 0).length,
    needsReorder: lowStockMeds.filter((m) => m.stockQuantity > 0 && m.stockQuantity <= m.reorderLevel).length,
  };

  const formatted = lowStockMeds.map(formatPopulatedMedicine);

  res.status(200).json({
    success: true,
    stats,
    count: formatted.length,
    data: formatted,
  });
});

exports.getExpiringMedicines = asyncHandler(async (req, res) => {
  const { months = 3 } = req.query;

  const today = new Date();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + parseInt(months));

  const medicines = await prisma.medicine.findMany({
    where: {
      expiryDate: { gte: today, lte: futureDate },
      isActive: true,
    },
    orderBy: { expiryDate: 'asc' },
  });

  const oneMonth = new Date();
  oneMonth.setMonth(oneMonth.getMonth() + 1);

  const stats = {
    total: medicines.length,
    expiringSoon: medicines.filter((m) => new Date(m.expiryDate) <= oneMonth).length,
    expiringLater: medicines.filter((m) => new Date(m.expiryDate) > oneMonth).length,
  };

  const formatted = medicines.map(formatPopulatedMedicine);

  res.status(200).json({
    success: true,
    stats,
    count: formatted.length,
    data: formatted,
  });
});

exports.getExpiredMedicines = asyncHandler(async (req, res) => {
  const medicines = await prisma.medicine.findMany({
    where: {
      expiryDate: { lt: new Date() },
      isActive: true,
      stockQuantity: { gt: 0 },
    },
    orderBy: { expiryDate: 'desc' },
  });

  const formatted = medicines.map(formatPopulatedMedicine);

  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted,
  });
});

exports.getMedicineCategories = asyncHandler(async (req, res) => {
  const medicines = await prisma.medicine.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ['category'],
  });

  const categories = medicines.map((m) => m.category);

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

exports.getMedicineStats = asyncHandler(async (req, res) => {
  const medicines = await prisma.medicine.findMany({ where: { isActive: true } });

  const totalMedicines = medicines.length;
  const lowStock = medicines.filter((m) => m.stockQuantity <= m.reorderLevel).length;

  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  const expiringSoon = medicines.filter((m) => new Date(m.expiryDate) <= threeMonthsFromNow && new Date(m.expiryDate) >= new Date()).length;

  const outOfStock = medicines.filter((m) => m.stockQuantity === 0).length;
  const totalStockValue = medicines.reduce((sum, m) => sum + m.stockQuantity * m.unitPrice, 0);

  const catMap = {};
  medicines.forEach((m) => {
    const cat = m.category;
    if (!catMap[cat]) catMap[cat] = { _id: cat, count: 0, totalStock: 0 };
    catMap[cat].count += 1;
    catMap[cat].totalStock += m.stockQuantity;
  });

  const categoryDistribution = Object.values(catMap).sort((a, b) => b.count - a.count);

  res.status(200).json({
    success: true,
    data: {
      totalMedicines,
      lowStock,
      expiringSoon,
      outOfStock,
      totalStockValue,
      categoryDistribution,
    },
  });
});

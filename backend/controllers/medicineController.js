const Medicine = require('../models/Medicine');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create new medicine
// @route   POST /api/medicines
// @access  Private (Admin, Pharmacist)
exports.createMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.create(req.body);
  
  // Ensure the medicine is saved and all fields including medicineId are populated
  const savedMedicine = await Medicine.findById(medicine._id);
  
  res.status(201).json({
    success: true,
    message: 'Medicine created successfully',
    data: savedMedicine
  });
});

// @desc    Get all medicines with filters
// @route   GET /api/medicines
// @access  Private
exports.getMedicines = asyncHandler(async (req, res) => {
  const { category, search, lowStock, expiringSoon, page = 1, limit = 100 } = req.query;
  
  let query = { isActive: true };
  
  // Filter by category
  if (category) {
    query.category = category;
  }
  
  // Search by name, generic name, or medicine ID
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { genericName: new RegExp(search, 'i') },
      { manufacturer: new RegExp(search, 'i') },
      { medicineId: new RegExp(search, 'i') }
    ];
  }
  
  // Filter low stock medicines
  if (lowStock === 'true') {
    query.$expr = { $lte: ['$stockQuantity', '$reorderLevel'] };
  }
  
  // Filter expiring soon medicines (within 3 months)
  if (expiringSoon === 'true') {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    query.expiryDate = { $lte: threeMonthsFromNow, $gte: new Date() };
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const medicines = await Medicine.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Medicine.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count: medicines.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: medicines
  });
});

// @desc    Get single medicine by ID
// @route   GET /api/medicines/:id
// @access  Private
exports.getMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  
  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  res.status(200).json({
    success: true,
    data: medicine
  });
});

// @desc    Update medicine
// @route   PUT /api/medicines/:id
// @access  Private (Admin, Pharmacist)
exports.updateMedicine = asyncHandler(async (req, res) => {
  let medicine = await Medicine.findById(req.params.id);
  
  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  // Don't allow updating medicineId
  delete req.body.medicineId;

  medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    message: 'Medicine updated successfully',
    data: medicine
  });
});

// @desc    Delete medicine (soft delete)
// @route   DELETE /api/medicines/:id
// @access  Private (Admin)
exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  
  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  await medicine.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Medicine deleted successfully'
  });
});

// @desc    Update medicine stock
// @route   PUT /api/medicines/:id/stock
// @access  Private (Admin, Pharmacist)
exports.updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation, batchNumber, expiryDate } = req.body;
  
  if (!quantity || !operation) {
    return res.status(400).json({
      success: false,
      message: 'Quantity and operation are required'
    });
  }

  const medicine = await Medicine.findById(req.params.id);
  
  if (!medicine) {
    return res.status(404).json({
      success: false,
      message: 'Medicine not found'
    });
  }

  if (operation === 'add') {
    medicine.stockQuantity += parseInt(quantity);
    medicine.lastRestocked = new Date();
    
    // Update batch info if provided
    if (batchNumber) medicine.batchNumber = batchNumber;
    if (expiryDate) medicine.expiryDate = expiryDate;
    
  } else if (operation === 'reduce') {
    if (medicine.stockQuantity < parseInt(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${medicine.stockQuantity}`
      });
    }
    medicine.stockQuantity -= parseInt(quantity);
  } else if (operation === 'set') {
    medicine.stockQuantity = parseInt(quantity);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Invalid operation. Use: add, reduce, or set'
    });
  }

  await medicine.save();

  res.status(200).json({
    success: true,
    message: `Stock ${operation === 'add' ? 'added' : operation === 'reduce' ? 'reduced' : 'updated'} successfully`,
    data: medicine
  });
});

// @desc    Get low stock medicines alert
// @route   GET /api/medicines/alerts/low-stock
// @access  Private (Admin, Pharmacist)
exports.getLowStockAlert = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
    isActive: true
  }).sort('stockQuantity');

  const stats = {
    totalLowStock: medicines.length,
    criticalStock: medicines.filter(m => m.stockQuantity === 0).length,
    needsReorder: medicines.filter(m => m.stockQuantity > 0 && m.stockQuantity <= m.reorderLevel).length
  };

  res.status(200).json({ 
    success: true,
    stats,
    count: medicines.length, 
    data: medicines 
  });
});

// @desc    Get expiring medicines
// @route   GET /api/medicines/alerts/expiring
// @access  Private (Admin, Pharmacist)
exports.getExpiringMedicines = asyncHandler(async (req, res) => {
  const { months = 3 } = req.query;
  
  const today = new Date();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + parseInt(months));

  const medicines = await Medicine.find({
    expiryDate: { 
      $gte: today,
      $lte: futureDate 
    },
    isActive: true
  }).sort('expiryDate');

  const oneMonth = new Date();
  oneMonth.setMonth(oneMonth.getMonth() + 1);
  
  const stats = {
    total: medicines.length,
    expiringSoon: medicines.filter(m => new Date(m.expiryDate) <= oneMonth).length,
    expiringLater: medicines.filter(m => new Date(m.expiryDate) > oneMonth).length
  };

  res.status(200).json({ 
    success: true,
    stats,
    count: medicines.length, 
    data: medicines 
  });
});

// @desc    Get expired medicines
// @route   GET /api/medicines/alerts/expired
// @access  Private (Admin, Pharmacist)
exports.getExpiredMedicines = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    expiryDate: { $lt: new Date() },
    isActive: true,
    stockQuantity: { $gt: 0 }
  }).sort('-expiryDate');

  res.status(200).json({
    success: true,
    count: medicines.length,
    data: medicines
  });
});

// @desc    Get medicine categories
// @route   GET /api/medicines/categories
// @access  Private
exports.getMedicineCategories = asyncHandler(async (req, res) => {
  const categories = await Medicine.distinct('category');
  
  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get medicine statistics
// @route   GET /api/medicines/stats
// @access  Private (Admin, Pharmacist)
exports.getMedicineStats = asyncHandler(async (req, res) => {
  const totalMedicines = await Medicine.countDocuments({ isActive: true });
  
  const lowStock = await Medicine.countDocuments({
    $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
    isActive: true
  });
  
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  const expiringSoon = await Medicine.countDocuments({
    expiryDate: { $lte: threeMonthsFromNow, $gte: new Date() },
    isActive: true
  });

  const outOfStock = await Medicine.countDocuments({
    stockQuantity: 0,
    isActive: true
  });

  const totalStockValue = await Medicine.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: null, total: { $sum: { $multiply: ['$stockQuantity', '$unitPrice'] } } } }
  ]);

  const categoryDistribution = await Medicine.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalStock: { $sum: '$stockQuantity' } } },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalMedicines,
      lowStock,
      expiringSoon,
      outOfStock,
      totalStockValue: totalStockValue[0]?.total || 0,
      categoryDistribution
    }
  });
});
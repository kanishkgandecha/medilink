const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Prescription = require('../models/Prescription');
const Medicine = require('../models/Medicine');
const Billing = require('../models/Billing');

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private (Doctor)
const createPrescription = async (req, res) => {
  const { patient, appointment, medicines, diagnosis, symptoms, labTests, validUntil, refillsAllowed, notes } = req.body;

  // Validate patient exists
  const patientExists = await Patient.findById(patient);
  if (!patientExists) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found'
    });
  }

  // Auto-resolve doctor from logged-in user
  const doctorExists = await Doctor.findOne({ userId: req.user._id });
  if (!doctorExists) {
    return res.status(404).json({
      success: false,
      message: 'Doctor profile not found for this account'
    });
  }
  const doctor = doctorExists._id;

  // Validate medicine availability and stock
  for (let med of medicines) {
    const medicine = await Medicine.findById(med.medicine);
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine with ID ${med.medicine} not found`
      });
    }
    
    if (!medicine.isActive) {
      return res.status(400).json({
        success: false,
        message: `Medicine ${medicine.name} is not active`
      });
    }
    
    if (medicine.stockQuantity < med.quantity) {
      return res.status(400).json({ 
        success: false,
        message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}, Required: ${med.quantity}` 
      });
    }
  }

  // Create prescription
  const prescription = await Prescription.create({
    patient,
    doctor,
    appointment,
    medicines,
    diagnosis,
    symptoms,
    labTests,
    refillsAllowed: refillsAllowed || 0,
    validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
    notes
  });

  // Populate the response
  await prescription.populate([
    { path: 'patient', select: 'patientId userId', populate: { path: 'userId', select: 'name email phone' } },
    { path: 'doctor', select: 'userId specialization', populate: { path: 'userId', select: 'name' } },
    { path: 'medicines.medicine', select: 'name genericName strength unitPrice' }
  ]);

  res.status(201).json({
    success: true,
    message: 'Prescription created successfully',
    data: prescription
  });
};

// @desc    Get all prescriptions with filters
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res) => {
  const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

  let query = {};

  // Auto-filter based on role
  if (req.user.role === 'Patient') {
    const patientProfile = await Patient.findOne({ userId: req.user._id });
    if (!patientProfile) return res.json({ success: true, count: 0, data: [] });
    query.patient = patientProfile._id;
  } else if (req.user.role === 'Doctor') {
    const doctorProfile = await Doctor.findOne({ userId: req.user._id });
    if (!doctorProfile) return res.json({ success: true, count: 0, data: [] });
    query.doctor = doctorProfile._id;
  }
  // Pharmacist and Admin see all

  if (status) query.status = status;
  
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const prescriptions = await Prescription.find(query)
    .populate({
      path: 'patient',
      select: 'patientId userId',
      populate: { path: 'userId', select: 'name phone' }
    })
    .populate({
      path: 'doctor',
      select: 'userId specialization',
      populate: { path: 'userId', select: 'name email' }
    })
    .populate('medicines.medicine', 'name genericName strength unitPrice')
    .populate('appointment', 'appointmentId appointmentDate')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Prescription.countDocuments(query);

  res.status(200).json({
    success: true,
    count: prescriptions.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: prescriptions
  });
};

// @desc    Get single prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
const getPrescription = async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'userId' } })
    .populate({ path: 'doctor', populate: { path: 'userId' } })
    .populate('medicines.medicine')
    .populate('appointment');
  
  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found'
    });
  }

  res.status(200).json({
    success: true,
    data: prescription
  });
};

// @desc    Update prescription status
// @route   PUT /api/prescriptions/:id/status
// @access  Private (Pharmacist)
const updatePrescriptionStatus = async (req, res) => {
  const { status } = req.body;
  
  const validStatuses = ['Pending', 'Partially-Filled', 'Fulfilled', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const prescription = await Prescription.findById(req.params.id);
  
  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found'
    });
  }

  // If fulfilling prescription, update medicine stock
  const billingItems = [];
  let billingSubtotal = 0;

  if (status === 'Fulfilled' || status === 'Partially-Filled') {
    for (let med of prescription.medicines) {
      const medicine = await Medicine.findById(med.medicine);

      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found for prescription item`
        });
      }

      if (medicine.stockQuantity < med.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${medicine.name}`
        });
      }

      // Reduce stock
      medicine.stockQuantity -= med.quantity;
      await medicine.save();

      const unitPrice = medicine.unitPrice || 0;
      const amount = unitPrice * med.quantity;
      billingItems.push({
        description: `${medicine.name}${medicine.strength ? ' ' + medicine.strength : ''}`,
        category: 'Medicine',
        quantity: med.quantity,
        unitPrice,
        amount
      });
      billingSubtotal += amount;
    }
  }

  prescription.status = status;
  await prescription.save();

  // Auto-generate medicine bill when a prescription is fully fulfilled
  if (status === 'Fulfilled' && billingItems.length > 0) {
    await Billing.create({
      patient: prescription.patient,
      items: billingItems,
      subtotal: billingSubtotal,
      totalAmount: billingSubtotal,
      balance: billingSubtotal,
      billType: 'Pharmacy',
      createdByRole: 'Pharmacist',
      generatedBy: req.user._id,
      notes: `Auto-generated on prescription fulfilment`
    });
  }

  await prescription.populate([
    { path: 'patient', select: 'patientId userId' },
    { path: 'doctor', select: 'userId specialization' },
    { path: 'medicines.medicine', select: 'name genericName' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Prescription status updated successfully',
    data: prescription
  });
};

// @desc    Refill prescription
// @route   POST /api/prescriptions/:id/refill
// @access  Private (Pharmacist)
const refillPrescription = async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('medicines.medicine');
  
  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found'
    });
  }

  // Check if refills are available
  if (prescription.refillsUsed >= prescription.refillsAllowed) {
    return res.status(400).json({
      success: false,
      message: `No refills remaining. Used: ${prescription.refillsUsed}/${prescription.refillsAllowed}`
    });
  }

  // Check if prescription is still valid
  if (new Date() > prescription.validUntil) {
    return res.status(400).json({
      success: false,
      message: 'Prescription has expired. Please get a new prescription from doctor.'
    });
  }

  // Check and update stock
  for (let med of prescription.medicines) {
    const medicine = await Medicine.findById(med.medicine);
    
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: `Medicine not found`
      });
    }

    if (medicine.stockQuantity < med.quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${medicine.name}. Available: ${medicine.stockQuantity}`
      });
    }

    medicine.stockQuantity -= med.quantity;
    await medicine.save();
  }

  prescription.refillsUsed += 1;
  
  // If this was the last refill, mark as fulfilled
  if (prescription.refillsUsed >= prescription.refillsAllowed) {
    prescription.status = 'Fulfilled';
  }
  
  await prescription.save();

  res.status(200).json({
    success: true,
    message: `Prescription refilled successfully. Refills remaining: ${prescription.refillsAllowed - prescription.refillsUsed}`,
    data: prescription
  });
};

// @desc    Update prescription
// @route   PUT /api/prescriptions/:id
// @access  Private (Doctor)
const updatePrescription = async (req, res) => {
  let prescription = await Prescription.findById(req.params.id);
  
  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found'
    });
  }

  // Only allow updates if prescription is still pending
  if (prescription.status !== 'Pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update prescription that has been processed'
    });
  }

  prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate([
    { path: 'patient', select: 'patientId userId' },
    { path: 'doctor', select: 'userId specialization' },
    { path: 'medicines.medicine', select: 'name genericName strength' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Prescription updated successfully',
    data: prescription
  });
};

// @desc    Cancel prescription
// @route   DELETE /api/prescriptions/:id
// @access  Private (Doctor, Admin)
const cancelPrescription = async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  
  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found'
    });
  }

  if (prescription.status === 'Fulfilled') {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel fulfilled prescription'
    });
  }

  prescription.status = 'Cancelled';
  await prescription.save();

  res.status(200).json({
    success: true,
    message: 'Prescription cancelled successfully'
  });
};

// @desc    Get prescription statistics
// @route   GET /api/prescriptions/stats
// @access  Private (Admin, Pharmacist)
const getPrescriptionStats = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const totalPrescriptions = await Prescription.countDocuments(dateFilter);
  const pending = await Prescription.countDocuments({ ...dateFilter, status: 'Pending' });
  const fulfilled = await Prescription.countDocuments({ ...dateFilter, status: 'Fulfilled' });
  const cancelled = await Prescription.countDocuments({ ...dateFilter, status: 'Cancelled' });

  const topMedicines = await Prescription.aggregate([
    { $match: dateFilter },
    { $unwind: '$medicines' },
    { $group: { _id: '$medicines.medicine', count: { $sum: '$medicines.quantity' } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
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
        totalDispensed: '$count'
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPrescriptions,
      statusBreakdown: { pending, fulfilled, cancelled },
      topMedicines
    }
  });
};




module.exports = {
  createPrescription,
  getPrescriptions,
  updatePrescriptionStatus,
  getPrescription,
  refillPrescription,
  updatePrescription,
  getPrescriptionStats
}

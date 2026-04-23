const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const isPharmacistRole = (user) =>
  user.role === 'Pharmacist' || user.subRole === 'Pharmacist';

const resolvedRole = (user) =>
  user.role === 'Staff' ? user.subRole : user.role;

// @desc    Get all users with role "Patient" for billing dropdown
// @route   GET /api/billing/patient-users
// @access  Private (Admin, Receptionist)
exports.getPatientUsers = asyncHandler(async (req, res) => {
  const patientUsers = await User.find({ role: 'Patient' })
    .select('_id name email phone dateOfBirth gender address')
    .sort('name');

  const patients = await Patient.find().select('userId patientId');
  const patientIdMap = {};
  patients.forEach(p => {
    if (p.userId) patientIdMap[p.userId.toString()] = p.patientId;
  });

  const enhancedUsers = patientUsers.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    dateOfBirth: u.dateOfBirth,
    gender: u.gender,
    address: u.address,
    patientId: patientIdMap[u._id.toString()] || 'N/A'
  }));

  res.status(200).json({ success: true, count: enhancedUsers.length, enhancedUsers });
});

// @desc    Create new bill
// @route   POST /api/billing
// @access  Private (Admin, Receptionist, Pharmacist)
exports.createBill = asyncHandler(async (req, res) => {
  const { patient, items, discount, tax, notes, paymentMethod, billType, relatedAppointmentId } = req.body;

  const pharmacist = isPharmacistRole(req.user);

  // Pharmacist can only create Pharmacy bills
  if (pharmacist && billType && billType !== 'Pharmacy') {
    return res.status(403).json({
      success: false,
      message: 'Pharmacists can only create Pharmacy bills'
    });
  }

  const effectiveBillType = pharmacist ? 'Pharmacy' : (billType || 'Other');

  const user = await User.findById(patient);
  if (!user || user.role !== 'Patient') {
    return res.status(404).json({ success: false, message: 'User not found or not a patient' });
  }

  let patientProfile = await Patient.findOne({ userId: patient });
  if (!patientProfile) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    patientProfile = await Patient.create({ userId: patient, patientId: `PAT${ts}${rand}` });
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = discount || 0;
  const taxAmount = tax || 0;
  const totalAmount = subtotal - discountAmount + taxAmount;

  const bill = await Billing.create({
    patient: patientProfile._id,
    items: items.map(item => ({ ...item, amount: item.quantity * item.unitPrice })),
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    totalAmount,
    balance: totalAmount,
    billType: effectiveBillType,
    paymentMethod: paymentMethod || undefined,
    createdByRole: resolvedRole(req.user),
    relatedAppointmentId: relatedAppointmentId || undefined,
    notes,
    generatedBy: req.user.id
  });

  await bill.populate([
    { path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } },
    { path: 'generatedBy', select: 'name role' }
  ]);

  res.status(201).json({ success: true, message: 'Bill created successfully', bill });
});

// @desc    Get all bills (role-filtered)
// @route   GET /api/billing
// @access  Private
exports.getBills = asyncHandler(async (req, res) => {
  const { patient, paymentStatus, startDate, endDate, search, page = 1, limit = 10 } = req.query;

  let query = {};

  if (req.user.role === 'Patient') {
    // Patients see only their own bills
    const patientProfile = await Patient.findOne({ userId: req.user._id });
    if (!patientProfile) return res.json({ success: true, count: 0, total: 0, bills: [] });
    query.patient = patientProfile._id;
  } else if (isPharmacistRole(req.user)) {
    // Pharmacist sees ONLY pharmacy bills
    query.billType = 'Pharmacy';
    if (patient) query.patient = patient;
  } else {
    // Admin / Receptionist see all bills
    if (patient) query.patient = patient;
  }

  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate && endDate) {
    query.billDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  if (search) {
    query.$or = [{ billNumber: new RegExp(search, 'i') }];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const bills = await Billing.find(query)
    .populate({ path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } })
    .populate('generatedBy', 'name role')
    .limit(parseInt(limit))
    .skip(skip)
    .sort('-billDate');

  const total = await Billing.countDocuments(query);

  res.status(200).json({ success: true, count: bills.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), bills });
});

// @desc    Get single bill
// @route   GET /api/billing/:id
// @access  Private
exports.getBill = asyncHandler(async (req, res) => {
  const bill = await Billing.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } })
    .populate('generatedBy', 'name role');

  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  // Pharmacist can only view pharmacy bills
  if (isPharmacistRole(req.user) && bill.billType !== 'Pharmacy') {
    return res.status(403).json({ success: false, message: 'Not authorized to view this bill' });
  }

  res.status(200).json({ success: true, data: bill });
});

// @desc    Patient pays their own bill (full balance)
// @route   POST /api/billing/:id/pay
// @access  Private (Patient only)
exports.patientPayBill = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;

  if (!paymentMethod) {
    return res.status(400).json({ success: false, message: 'Payment method is required' });
  }

  const bill = await Billing.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  // Confirm this bill belongs to the requesting patient
  const patientProfile = await Patient.findOne({ userId: req.user._id });
  if (!patientProfile || bill.patient.toString() !== patientProfile._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized to pay this bill' });
  }

  if (bill.paymentStatus === 'Paid') {
    return res.status(400).json({ success: false, message: 'Bill is already fully paid' });
  }

  const amount = bill.balance;
  bill.amountPaid += amount;
  bill.balance = 0;
  bill.paymentStatus = 'Paid';
  bill.paymentMethod = paymentMethod;

  if (!bill.payments) bill.payments = [];
  bill.payments.push({ amount, paymentMethod, paymentDate: new Date() });

  await bill.save();

  await bill.populate([
    { path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } },
    { path: 'generatedBy', select: 'name role' }
  ]);

  res.status(200).json({ success: true, message: 'Payment successful', bill });
});

// @desc    Record partial or full payment (Admin/Receptionist)
// @route   POST /api/billing/:id/payment
// @access  Private (Admin, Receptionist)
exports.recordPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, transactionId, notes } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
  }
  if (!paymentMethod) {
    return res.status(400).json({ success: false, message: 'Payment method is required' });
  }

  const bill = await Billing.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  if (amount > bill.balance) {
    return res.status(400).json({ success: false, message: `Payment (${amount}) exceeds balance (${bill.balance})` });
  }

  bill.amountPaid += parseFloat(amount);
  bill.balance = bill.totalAmount - bill.amountPaid;
  bill.paymentMethod = paymentMethod;

  if (!bill.payments) bill.payments = [];
  bill.payments.push({ amount: parseFloat(amount), paymentMethod, transactionId, notes, paymentDate: new Date() });

  bill.paymentStatus = bill.balance === 0 ? 'Paid' : bill.amountPaid > 0 ? 'Partially-Paid' : 'Unpaid';

  await bill.save();

  await bill.populate([
    { path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } },
    { path: 'generatedBy', select: 'name role' }
  ]);

  res.status(200).json({ success: true, message: 'Payment recorded successfully', bill });
});

// @desc    Submit insurance claim
// @route   POST /api/billing/:id/insurance
// @access  Private (Admin, Receptionist)
exports.processInsuranceClaim = asyncHandler(async (req, res) => {
  const { claimNumber, provider, amountClaimed } = req.body;

  if (!claimNumber || !provider || !amountClaimed) {
    return res.status(400).json({ success: false, message: 'Claim number, provider, and amount are required' });
  }

  const bill = await Billing.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  bill.insuranceClaim = {
    claimNumber, provider,
    amountClaimed: parseFloat(amountClaimed),
    status: 'Pending',
    submittedDate: new Date()
  };

  await bill.save();
  await bill.populate([
    { path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } },
    { path: 'generatedBy', select: 'name role' }
  ]);

  res.status(200).json({ success: true, message: 'Insurance claim submitted', bill });
});

// @desc    Update insurance claim status
// @route   PUT /api/billing/:id/insurance
// @access  Private (Admin)
exports.updateInsuranceClaim = asyncHandler(async (req, res) => {
  const { status, approvedAmount, rejectionReason } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

  const bill = await Billing.findById(req.params.id);
  if (!bill || !bill.insuranceClaim) {
    return res.status(404).json({ success: false, message: 'Bill or insurance claim not found' });
  }

  bill.insuranceClaim.status = status;
  bill.insuranceClaim.processedDate = new Date();

  if (status === 'Approved' || status === 'Partially-Approved') {
    const amount = approvedAmount || bill.insuranceClaim.amountClaimed;
    bill.insuranceClaim.approvedAmount = amount;
    bill.amountPaid += parseFloat(amount);
    bill.balance = bill.totalAmount - bill.amountPaid;

    if (!bill.payments) bill.payments = [];
    bill.payments.push({
      amount: parseFloat(amount),
      paymentMethod: 'Insurance',
      notes: `Insurance claim ${bill.insuranceClaim.claimNumber}`,
      paymentDate: new Date()
    });

    bill.paymentStatus = bill.balance === 0 ? 'Paid' : 'Partially-Paid';
  } else if (status === 'Rejected') {
    bill.insuranceClaim.rejectionReason = rejectionReason;
  }

  await bill.save();
  await bill.populate([
    { path: 'patient', populate: { path: 'userId', select: 'name email phone address dateOfBirth gender' } },
    { path: 'generatedBy', select: 'name role' }
  ]);

  res.status(200).json({ success: true, message: `Insurance claim ${status.toLowerCase()}`, bill });
});

// @desc    Billing statistics (role-filtered)
// @route   GET /api/billing/stats
// @access  Private (Admin, Receptionist, Pharmacist)
exports.getBillingStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let baseQuery = {};
  if (startDate && endDate) {
    baseQuery.billDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  // Pharmacist only sees pharmacy bill stats
  if (isPharmacistRole(req.user)) {
    baseQuery.billType = 'Pharmacy';
  }

  const [totalBills, totalRevenue, totalCollected, totalPending, paymentStatusBreakdown, paymentMethodBreakdown] = await Promise.all([
    Billing.countDocuments(baseQuery),
    Billing.aggregate([{ $match: baseQuery }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Billing.aggregate([{ $match: baseQuery }, { $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
    Billing.aggregate([{ $match: baseQuery }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
    Billing.aggregate([{ $match: baseQuery }, { $group: { _id: '$paymentStatus', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }]),
    Billing.aggregate([{ $match: { ...baseQuery, paymentMethod: { $ne: null } } }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amountPaid' } } }])
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalBills,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCollected: totalCollected[0]?.total || 0,
      totalPending: totalPending[0]?.total || 0,
      paymentStatusBreakdown,
      paymentMethodBreakdown
    }
  });
});

// @desc    Delete bill (unpaid only)
// @route   DELETE /api/billing/:id
// @access  Private (Admin)
exports.deleteBill = asyncHandler(async (req, res) => {
  const bill = await Billing.findById(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  if (bill.amountPaid > 0) {
    return res.status(400).json({ success: false, message: 'Cannot delete a bill with recorded payments' });
  }

  await bill.deleteOne();
  res.status(200).json({ success: true, message: 'Bill deleted successfully' });
});

const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
const { runSerializableTransaction } = require('../utils/transactions');

const isPharmacistRole = (user) => user.role === 'Pharmacist' || user.subRole === 'Pharmacist';
const resolvedRole = (user) => (user.role === 'Staff' ? user.subRole : user.role);

const formatPopulatedBill = (bill) => {
  if (!bill) return null;
  return {
    ...bill,
    _id: bill.id,
    patient: bill.patient
      ? {
          ...bill.patient,
          _id: bill.patient.id,
          userId: bill.patient.user
            ? {
                ...bill.patient.user,
                _id: bill.patient.user.id,
                address: {
                  street: bill.patient.user.street,
                  city: bill.patient.user.city,
                  state: bill.patient.user.state,
                  zipCode: bill.patient.user.zipCode,
                  country: bill.patient.user.country,
                },
              }
            : null,
        }
      : null,
    generatedBy: bill.generatedBy ? { ...bill.generatedBy, _id: bill.generatedBy.id } : null,
  };
};

exports.getPatientUsers = asyncHandler(async (req, res) => {
  const patientUsers = await prisma.user.findMany({
    where: { role: 'Patient' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      gender: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      country: true,
    },
    orderBy: { name: 'asc' },
  });

  const patients = await prisma.patient.findMany({ select: { userId: true, patientId: true } });
  const patientIdMap = {};
  patients.forEach((p) => {
    patientIdMap[p.userId] = p.patientId;
  });

  const enhancedUsers = patientUsers.map((u) => ({
    _id: u.id,
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    dateOfBirth: u.dateOfBirth,
    gender: u.gender,
    address: {
      street: u.street,
      city: u.city,
      state: u.state,
      zipCode: u.zipCode,
      country: u.country,
    },
    patientId: patientIdMap[u.id] || 'N/A',
  }));

  res.status(200).json({ success: true, count: enhancedUsers.length, enhancedUsers });
});

exports.createBill = asyncHandler(async (req, res) => {
  const { patient, items, discount, tax, notes, paymentMethod, billType, relatedAppointmentId } = req.body;
  const pharmacist = isPharmacistRole(req.user);

  if (pharmacist && billType && billType !== 'Pharmacy') {
    return res.status(403).json({
      success: false,
      message: 'Pharmacists can only create Pharmacy bills',
    });
  }

  const VALID_BILL_TYPES = ['Consultation', 'Pharmacy', 'Test', 'Other'];
  const sanitisedBillType = billType === 'Medicine' ? 'Pharmacy' : VALID_BILL_TYPES.includes(billType) ? billType : 'Other';
  const effectiveBillType = pharmacist ? 'Pharmacy' : sanitisedBillType;

  const targetUser = await prisma.user.findFirst({
    where: { OR: [{ id: patient }, { legacyMongoId: patient }] },
  });

  if (!targetUser || targetUser.role !== 'Patient') {
    return res.status(404).json({ success: false, message: 'User not found or not a patient' });
  }

  let patientProfile = await prisma.patient.findFirst({ where: { userId: targetUser.id } });
  if (!patientProfile) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    patientProfile = await prisma.patient.create({
      data: { userId: targetUser.id, patientId: `PAT${ts}${rand}` },
    });
  }

  const subtotal = (items || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = Number(discount || 0);
  const taxAmount = Number(tax || 0);
  const totalAmount = subtotal - discountAmount + taxAmount;

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  const billNumber = `BILL-${year}${month}-${ts}${rand}`;

  let targetApptId = null;
  if (relatedAppointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { OR: [{ id: relatedAppointmentId }, { legacyMongoId: relatedAppointmentId }] },
    });
    if (appt) targetApptId = appt.id;
  }

  const bill = await prisma.billing.create({
    data: {
      billNumber,
      patientId: patientProfile.id,
      billType: effectiveBillType,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      totalAmount,
      balance: totalAmount,
      amountPaid: 0,
      paymentStatus: 'Unpaid',
      paymentMethod: paymentMethod || null,
      createdByRole: resolvedRole(req.user) || null,
      generatedById: req.user.id,
      relatedAppointmentId: targetApptId,
      notes: notes || null,
      items: {
        create: (items || []).map((item) => ({
          description: item.description || 'Service',
          category: item.category || 'Other',
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          amount: Number(item.quantity || 1) * Number(item.unitPrice || 0),
        })),
      },
    },
    include: {
      patient: { include: { user: true } },
      generatedBy: { select: { id: true, name: true, role: true } },
      items: true,
      payments: true,
    },
  });

  res.status(201).json({ success: true, message: 'Bill created successfully', bill: formatPopulatedBill(bill) });
});

exports.getBills = asyncHandler(async (req, res) => {
  const { patient, paymentStatus, startDate, endDate, search } = req.query;

  const where = {};

  if (req.user.role === 'Patient') {
    const patientProfile = await prisma.patient.findFirst({ where: { userId: req.user.id } });
    if (!patientProfile) return res.json({ success: true, count: 0, total: 0, bills: [] });
    where.patientId = patientProfile.id;
  } else if (isPharmacistRole(req.user)) {
    where.billType = 'Pharmacy';
    if (patient) {
      const p = await prisma.patient.findFirst({ where: { OR: [{ id: patient }, { legacyMongoId: patient }] } });
      if (p) where.patientId = p.id;
    }
  } else {
    if (patient) {
      const p = await prisma.patient.findFirst({ where: { OR: [{ id: patient }, { legacyMongoId: patient }] } });
      if (p) where.patientId = p.id;
    }
  }

  if (paymentStatus) where.paymentStatus = paymentStatus;

  if (startDate && endDate) {
    where.billDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  if (search) {
    where.billNumber = { contains: search, mode: 'insensitive' };
  }

  const { page, limit: take, skip } = getPagination(req.query);

  const bills = await prisma.billing.findMany({
    where,
    include: {
      patient: { include: { user: true } },
      generatedBy: { select: { id: true, name: true, role: true } },
      items: true,
      payments: true,
    },
    orderBy: { billDate: 'desc' },
    take,
    skip,
  });

  const total = await prisma.billing.count({ where });

  const formattedBills = bills.map(formatPopulatedBill);

  res.status(200).json({
    success: true,
    count: formattedBills.length,
    total,
    page,
    pages: Math.ceil(total / take),
    bills: formattedBills,
  });
});

exports.getBill = asyncHandler(async (req, res) => {
  const bill = await prisma.billing.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      patient: { include: { user: true } },
      generatedBy: { select: { id: true, name: true, role: true } },
      items: true,
      payments: true,
    },
  });

  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  if (isPharmacistRole(req.user) && bill.billType !== 'Pharmacy') {
    return res.status(403).json({ success: false, message: 'Not authorized to view this bill' });
  }

  res.status(200).json({ success: true, data: formatPopulatedBill(bill) });
});

exports.patientPayBill = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;

  if (!paymentMethod) {
    return res.status(400).json({ success: false, message: 'Payment method is required' });
  }

  const updatedBill = await runSerializableTransaction(async (tx) => {
    const bill = await tx.billing.findFirst({
      where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
      include: { patient: { select: { userId: true } } },
    });
    if (!bill) return { error: 'not_found' };
    if (bill.patient.userId !== req.user.id) return { error: 'forbidden' };
    if (bill.paymentStatus === 'Paid' || bill.balance <= 0) return { error: 'already_paid' };

    return tx.billing.update({
      where: { id: bill.id },
      data: {
        amountPaid: bill.totalAmount,
        balance: 0,
        paymentStatus: 'Paid',
        paymentMethod,
        payments: { create: [{ amount: bill.balance, paymentMethod, paymentDate: new Date() }] },
      },
      include: {
        patient: { include: { user: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
        items: true,
        payments: true,
      },
    });
  });

  if (updatedBill.error === 'not_found') return res.status(404).json({ success: false, message: 'Bill not found' });
  if (updatedBill.error === 'forbidden') return res.status(403).json({ success: false, message: 'Not authorized to pay this bill' });
  if (updatedBill.error === 'already_paid') return res.status(409).json({ success: false, message: 'Bill is already fully paid' });

  res.status(200).json({
    success: true,
    simulated: true,
    message: 'Demo payment recorded. No external payment gateway transaction was processed.',
    bill: formatPopulatedBill(updatedBill),
  });
});

exports.recordPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, transactionId, notes } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
  }
  if (!paymentMethod) {
    return res.status(400).json({ success: false, message: 'Payment method is required' });
  }

  const payAmt = parseFloat(amount);
  const updatedBill = await runSerializableTransaction(async (tx) => {
    const bill = await tx.billing.findFirst({
      where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    });
    if (!bill) return { error: 'not_found' };
    if (payAmt > bill.balance) return { error: 'exceeds_balance', balance: bill.balance };

    const newAmountPaid = bill.amountPaid + payAmt;
    const newBalance = bill.totalAmount - newAmountPaid;
    const paymentStatus = newBalance === 0 ? 'Paid' : 'Partially_Paid';

    return tx.billing.update({
      where: { id: bill.id },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        paymentStatus,
        paymentMethod,
        payments: {
          create: [{
            amount: payAmt,
            paymentMethod,
            transactionId: transactionId || null,
            notes: notes || null,
            paymentDate: new Date(),
          }],
        },
      },
      include: {
        patient: { include: { user: true } },
        generatedBy: { select: { id: true, name: true, role: true } },
        items: true,
        payments: true,
      },
    });
  });

  if (updatedBill.error === 'not_found') return res.status(404).json({ success: false, message: 'Bill not found' });
  if (updatedBill.error === 'exceeds_balance') {
    return res.status(409).json({ success: false, message: `Payment (${payAmt}) exceeds balance (${updatedBill.balance})` });
  }

  res.status(200).json({ success: true, message: 'Payment recorded successfully', bill: formatPopulatedBill(updatedBill) });
});

exports.processInsuranceClaim = asyncHandler(async (req, res) => {
  const { claimNumber, provider, amountClaimed } = req.body;

  if (!claimNumber || !provider || !amountClaimed) {
    return res.status(400).json({ success: false, message: 'Claim number, provider, and amount are required' });
  }

  const bill = await prisma.billing.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  if (bill.insuranceClaim && bill.insuranceClaim.status !== 'Rejected') {
    return res.status(409).json({ success: false, message: 'An active insurance claim already exists for this bill' });
  }

  const claimedAmount = parseFloat(amountClaimed);
  if (claimedAmount > bill.balance) {
    return res.status(400).json({ success: false, message: 'Claim amount cannot exceed the outstanding balance' });
  }

  const insuranceClaim = {
    claimNumber,
    provider,
    amountClaimed: claimedAmount,
    status: 'Pending',
    submittedDate: new Date().toISOString(),
  };

  const updatedBill = await prisma.billing.update({
    where: { id: bill.id },
    data: { insuranceClaim },
    include: {
      patient: { include: { user: true } },
      generatedBy: { select: { id: true, name: true, role: true } },
      items: true,
      payments: true,
    },
  });

  res.status(200).json({ success: true, message: 'Insurance claim submitted', bill: formatPopulatedBill(updatedBill) });
});

exports.updateInsuranceClaim = asyncHandler(async (req, res) => {
  const { status, approvedAmount, rejectionReason } = req.body;
  if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

  const bill = await prisma.billing.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });
  if (!bill || !bill.insuranceClaim) {
    return res.status(404).json({ success: false, message: 'Bill or insurance claim not found' });
  }

  const claim = typeof bill.insuranceClaim === 'object' ? { ...bill.insuranceClaim } : {};
  if (claim.status === 'Approved' || claim.status === 'Partially-Approved' || claim.status === 'Partially_Approved') {
    return res.status(409).json({ success: false, message: 'This insurance claim has already been processed' });
  }
  claim.status = status;
  claim.processedDate = new Date().toISOString();

  let updateData = { insuranceClaim: claim };

  if (status === 'Approved' || status === 'Partially-Approved' || status === 'Partially_Approved') {
    const amount = parseFloat(approvedAmount || claim.amountClaimed || 0);
    if (!Number.isFinite(amount) || amount <= 0 || amount > bill.balance || amount > Number(claim.amountClaimed || 0)) {
      return res.status(400).json({
        success: false,
        message: 'Approved amount must be positive and cannot exceed the claim or outstanding balance',
      });
    }
    claim.approvedAmount = amount;

    const newAmountPaid = bill.amountPaid + amount;
    const newBalance = bill.totalAmount - newAmountPaid;
    const paymentStatus = newBalance === 0 ? 'Paid' : 'Partially_Paid';

    updateData = {
      insuranceClaim: claim,
      amountPaid: newAmountPaid,
      balance: newBalance,
      paymentStatus,
      payments: {
        create: [
          {
            amount,
            paymentMethod: 'Insurance',
            notes: `Insurance claim ${claim.claimNumber}`,
            paymentDate: new Date(),
          },
        ],
      },
    };
  } else if (status === 'Rejected') {
    claim.rejectionReason = rejectionReason;
  }

  const updatedBill = await prisma.billing.update({
    where: { id: bill.id },
    data: updateData,
    include: {
      patient: { include: { user: true } },
      generatedBy: { select: { id: true, name: true, role: true } },
      items: true,
      payments: true,
    },
  });

  res.status(200).json({ success: true, message: `Insurance claim ${status.toLowerCase()}`, bill: formatPopulatedBill(updatedBill) });
});

exports.getBillingStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.billDate = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  if (isPharmacistRole(req.user)) {
    where.billType = 'Pharmacy';
  }

  const bills = await prisma.billing.findMany({ where });
  const totalBills = bills.length;
  const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCollected = bills.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPending = bills.reduce((sum, b) => sum + b.balance, 0);

  const statusMap = {};
  const methodMap = {};

  bills.forEach((b) => {
    const st = b.paymentStatus;
    if (!statusMap[st]) statusMap[st] = { _id: st, count: 0, amount: 0 };
    statusMap[st].count += 1;
    statusMap[st].amount += b.totalAmount;

    if (b.paymentMethod) {
      const pm = b.paymentMethod;
      if (!methodMap[pm]) methodMap[pm] = { _id: pm, count: 0, amount: 0 };
      methodMap[pm].count += 1;
      methodMap[pm].amount += b.amountPaid;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      totalBills,
      totalRevenue,
      totalCollected,
      totalPending,
      paymentStatusBreakdown: Object.values(statusMap),
      paymentMethodBreakdown: Object.values(methodMap),
    },
  });
});

exports.deleteBill = asyncHandler(async (req, res) => {
  const bill = await prisma.billing.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

  if (bill.amountPaid > 0) {
    return res.status(400).json({ success: false, message: 'Cannot delete a bill with recorded payments' });
  }

  await prisma.billing.delete({ where: { id: bill.id } });
  res.status(200).json({ success: true, message: 'Bill deleted successfully' });
});

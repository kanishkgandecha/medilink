const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
const { runSerializableTransaction, abortTransaction } = require('../utils/transactions');
const { normalizePrescriptionStatus, canTransitionPrescription } = require('../utils/stateMachines');

const formatPopulatedRx = (rx) => {
  if (!rx) return null;
  return {
    ...rx,
    _id: rx.id,
    patient: rx.patient
      ? {
          ...rx.patient,
          _id: rx.patient.id,
          userId: rx.patient.user ? { ...rx.patient.user, _id: rx.patient.user.id } : null,
        }
      : null,
    doctor: rx.doctor
      ? {
          ...rx.doctor,
          _id: rx.doctor.id,
          userId: rx.doctor.user ? { ...rx.doctor.user, _id: rx.doctor.user.id } : null,
        }
      : null,
    appointment: rx.appointment ? { ...rx.appointment, _id: rx.appointment.id } : null,
    medicines: (rx.medicines || []).map((m) => ({
      ...m,
      _id: m.id,
      medicine: m.medicine ? { ...m.medicine, _id: m.medicine.id } : null,
      dispensedBy: m.dispensedBy ? { ...m.dispensedBy, _id: m.dispensedBy.id } : null,
    })),
  };
};

const createPrescription = async (req, res) => {
  const { patient, appointment, medicines, diagnosis, symptoms, labTests, validUntil, refillsAllowed, notes } = req.body;

  const targetPatient = await prisma.patient.findFirst({
    where: { OR: [{ id: patient }, { legacyMongoId: patient }] },
  });
  if (!targetPatient) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }

  const doctorExists = await prisma.doctor.findFirst({ where: { userId: req.user.id } });
  if (!doctorExists) {
    return res.status(404).json({ success: false, message: 'Doctor profile not found for this account' });
  }

  let targetApptId = null;
  if (appointment) {
    const appt = await prisma.appointment.findFirst({
      where: { OR: [{ id: appointment }, { legacyMongoId: appointment }] },
    });
    if (!appt || appt.patientId !== targetPatient.id || appt.doctorId !== doctorExists.id) {
      return res.status(400).json({
        success: false,
        message: 'Appointment must belong to the selected patient and prescribing doctor',
      });
    }
    targetApptId = appt.id;
  }

  const medicineIds = (medicines || []).map((medicine) => medicine.medicine);
  if (new Set(medicineIds).size !== medicineIds.length) {
    return res.status(400).json({ success: false, message: 'A medicine may appear only once per prescription' });
  }

  for (let med of medicines || []) {
    const targetMedId = med.medicine;
    const medicine = await prisma.medicine.findFirst({
      where: { OR: [{ id: targetMedId }, { legacyMongoId: targetMedId }] },
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: `Medicine with ID ${targetMedId} not found` });
    }
    if (!medicine.isActive) {
      return res.status(400).json({ success: false, message: `Medicine ${medicine.name} is not active` });
    }
  }

  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
  const prescriptionId = `RX-${ts}-${rand}`;

  const preparedMedicines = [];
  for (let med of medicines || []) {
    const targetMed = await prisma.medicine.findFirst({
      where: { OR: [{ id: med.medicine }, { legacyMongoId: med.medicine }] },
    });
    if (targetMed) {
      preparedMedicines.push({
        medicineId: targetMed.id,
        dosage: med.dosage || '1 tablet',
        frequency: med.frequency || 'Once daily',
        duration: med.duration || '5 days',
        instructions: med.instructions || null,
        quantity: Number(med.quantity || 1),
      });
    }
  }

  const prescription = await prisma.prescription.create({
    data: {
      prescriptionId,
      patientId: targetPatient.id,
      doctorId: doctorExists.id,
      appointmentId: targetApptId,
      diagnosis: diagnosis || null,
      symptoms: symptoms || null,
      labTests: Array.isArray(labTests) ? labTests : [],
      refillsAllowed: Number(refillsAllowed || 0),
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: notes || null,
      medicines: {
        create: preparedMedicines,
      },
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      medicines: { include: { medicine: true } },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Prescription created successfully',
    data: formatPopulatedRx(prescription),
  });
};

const getPrescriptions = async (req, res) => {
  const { status, startDate, endDate } = req.query;

  const where = {};

  if (req.user.role === 'Patient') {
    const patientProfile = await prisma.patient.findFirst({ where: { userId: req.user.id } });
    if (!patientProfile) return res.json({ success: true, count: 0, data: [] });
    where.patientId = patientProfile.id;
  } else if (req.user.role === 'Doctor') {
    const doctorProfile = await prisma.doctor.findFirst({ where: { userId: req.user.id } });
    if (!doctorProfile) return res.json({ success: true, count: 0, data: [] });
    where.doctorId = doctorProfile.id;
  }

  if (status) where.status = status;

  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const { page, limit: take, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: {
      patient: { include: { user: { select: { id: true, name: true, phone: true } } } },
      doctor: { include: { user: { select: { id: true, name: true, email: true } } } },
      medicines: { include: { medicine: { select: { id: true, name: true, genericName: true, strength: true, unitPrice: true } } } },
      appointment: { select: { id: true, appointmentId: true, appointmentDate: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  const total = await prisma.prescription.count({ where });
  const formatted = prescriptions.map(formatPopulatedRx);

  res.status(200).json({
    success: true,
    count: formatted.length,
    total,
    page,
    pages: Math.ceil(total / take),
    data: formatted,
  });
};

const getPrescription = async (req, res) => {
  const prescription = await prisma.prescription.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      medicines: { include: { medicine: true } },
      appointment: true,
    },
  });

  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found' });
  }

  res.status(200).json({ success: true, data: formatPopulatedRx(prescription) });
};

const updatePrescriptionStatus = async (req, res) => {
  const { status } = req.body;
  const normalizedStatus = normalizePrescriptionStatus(status);

  const prescription = await prisma.prescription.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!prescription) {
    return res.status(404).json({ success: false, message: 'Prescription not found' });
  }

  if (!canTransitionPrescription(prescription.status, normalizedStatus)) {
    return res.status(409).json({
      success: false,
      message: `Prescription cannot transition from ${prescription.status} to ${normalizedStatus}`,
    });
  }

  if (!['Pending', 'Cancelled'].includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Dispensing controls partially-filled and fulfilled prescription statuses',
    });
  }

  await prisma.prescription.update({ where: { id: prescription.id }, data: { status: normalizedStatus } });

  const updatedRx = await prisma.prescription.findUnique({
    where: { id: prescription.id },
    include: {
      patient: { select: { id: true, patientId: true } },
      doctor: { select: { id: true, specialization: true } },
      medicines: { include: { medicine: { select: { id: true, name: true, genericName: true, stockQuantity: true } } } },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Prescription status updated successfully',
    data: formatPopulatedRx(updatedRx),
  });
};

const dispensePrescription = async (req, res) => {
  const { items, idempotencyKey } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'items array is required' });
  }
  const uniqueMedicineIds = new Set(items.map((item) => item.medicineId));
  if (uniqueMedicineIds.size !== items.length) {
    return res.status(400).json({ success: false, message: 'Each medicine may appear only once per dispense request' });
  }

  let result;
  try {
    result = await runSerializableTransaction(async (tx) => {
    const prescription = await tx.prescription.findFirst({
      where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
      include: { medicines: { include: { medicine: true } } },
    });
    if (!prescription) return { error: 'not_found' };

    const sourceKey = `prescription:${prescription.id}:dispense:${idempotencyKey}`;
    const existingBill = await tx.billing.findUnique({ where: { sourceKey } });
    if (existingBill) {
      const finalRx = await loadPrescriptionForDispense(tx, prescription.id);
      return { finalRx, bill: existingBill, nextStatus: finalRx.status, replayed: true };
    }

    if (!['Pending', 'Partially_Filled'].includes(prescription.status)) {
      return { error: 'terminal_status', status: prescription.status };
    }

    const preparedItems = [];
    for (const item of items) {
      const qty = Number.parseInt(item.dispensedQuantity, 10);
      const medLine = prescription.medicines.find(
        (line) => line.medicineId === item.medicineId || line.medicine?.legacyMongoId === item.medicineId
      );
      if (!medLine) return { error: 'not_prescribed', medicineId: item.medicineId };

      const remaining = medLine.quantity - (medLine.dispensedQuantity || 0);
      if (qty > remaining) return { error: 'exceeds_remaining', name: medLine.medicine.name, remaining };

      preparedItems.push({ qty, medLine });
    }

    const billingItems = [];
    let billingSubtotal = 0;
    for (const { qty, medLine } of preparedItems) {

      const stockUpdate = await tx.medicine.updateMany({
        where: { id: medLine.medicineId, stockQuantity: { gte: qty }, isActive: true },
        data: { stockQuantity: { decrement: qty } },
      });
      if (stockUpdate.count !== 1) abortTransaction({ error: 'insufficient_stock', name: medLine.medicine.name });

      await tx.prescriptionMedicine.update({
        where: { id: medLine.id },
        data: {
          dispensedQuantity: { increment: qty },
          dispensedById: req.user.id,
          dispensedAt: new Date(),
        },
      });

      const unitPrice = medLine.medicine.unitPrice || 0;
      const amount = unitPrice * qty;
      billingItems.push({
        description: `${medLine.medicine.name}${medLine.medicine.strength ? ` ${medLine.medicine.strength}` : ''}`,
        category: 'Medicine', quantity: qty, unitPrice, amount,
      });
      billingSubtotal += amount;
    }

    const lines = await tx.prescriptionMedicine.findMany({ where: { prescriptionId: prescription.id } });
    const allDispensed = lines.every((line) => line.dispensedQuantity >= line.quantity);
    const nextStatus = allDispensed ? 'Fulfilled' : 'Partially_Filled';
    if (!canTransitionPrescription(prescription.status, nextStatus)) {
      abortTransaction({ error: 'invalid_transition', status: prescription.status, nextStatus });
    }

    await tx.prescription.update({ where: { id: prescription.id }, data: { status: nextStatus } });
    const bill = await tx.billing.create({
      data: {
        sourceKey,
        patientId: prescription.patientId,
        subtotal: billingSubtotal,
        discount: 0,
        tax: 0,
        totalAmount: billingSubtotal,
        balance: billingSubtotal,
        billType: 'Pharmacy',
        createdByRole: 'Pharmacist',
        generatedById: req.user.id,
        notes: `Auto-generated - Rx ${prescription.prescriptionId}${nextStatus === 'Partially_Filled' ? ' (partial dispense)' : ''}`,
        items: { create: billingItems },
      },
    });
    const finalRx = await loadPrescriptionForDispense(tx, prescription.id);
    return { finalRx, bill, nextStatus, replayed: false };
    });
  } catch (error) {
    if (error.code !== 'MEDILINK_BUSINESS_RULE') throw error;
    result = error.result;
  }

  if (result.error === 'not_found') return res.status(404).json({ success: false, message: 'Prescription not found' });
  if (result.error === 'terminal_status') return res.status(409).json({ success: false, message: `Cannot dispense a ${result.status} prescription` });
  if (result.error === 'not_prescribed') return res.status(400).json({ success: false, message: `Medicine ${result.medicineId} is not part of this prescription` });
  if (result.error === 'exceeds_remaining') return res.status(409).json({ success: false, message: `Cannot dispense more than remaining for ${result.name}. Remaining: ${result.remaining}` });
  if (result.error === 'insufficient_stock') return res.status(409).json({ success: false, message: `Insufficient active stock for ${result.name}` });
  if (result.error === 'invalid_transition') return res.status(409).json({ success: false, message: `Prescription cannot transition from ${result.status} to ${result.nextStatus}` });

  res.status(200).json({
    success: true,
    replayed: result.replayed,
    message: result.replayed
      ? 'This dispense request was already completed; the original result was returned'
      : result.nextStatus === 'Fulfilled'
        ? 'Prescription fully dispensed and pharmacy bill generated'
        : 'Medicines partially dispensed',
    data: formatPopulatedRx(result.finalRx),
    bill: result.bill ? { ...result.bill, _id: result.bill.id } : null,
  });
};

const loadPrescriptionForDispense = (client, prescriptionId) => client.prescription.findUnique({
  where: { id: prescriptionId },
  include: {
    patient: { select: { id: true, patientId: true, user: { select: { id: true, name: true } } } },
    doctor: { select: { id: true, specialization: true, user: { select: { id: true, name: true } } } },
    medicines: {
      include: {
        medicine: { select: { id: true, name: true, genericName: true, strength: true, unitPrice: true, stockQuantity: true } },
        dispensedBy: { select: { id: true, name: true } },
      },
    },
  },
});

const refillPrescription = async (req, res) => {
  const { idempotencyKey } = req.body;
  let result;
  try {
    result = await runSerializableTransaction(async (tx) => {
    const prescription = await tx.prescription.findFirst({
      where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
      include: { medicines: { include: { medicine: true } } },
    });
    if (!prescription) return { error: 'not_found' };

    const sourceKey = `prescription:${prescription.id}:refill:${idempotencyKey}`;
    const existingBill = await tx.billing.findUnique({ where: { sourceKey } });
    if (existingBill) {
      const updated = await loadPrescriptionForDispense(tx, prescription.id);
      return { updated, bill: existingBill, replayed: true };
    }
    if (prescription.status !== 'Fulfilled') return { error: 'not_fulfilled' };
    if (prescription.refillsUsed >= prescription.refillsAllowed) {
      return { error: 'no_refills', used: prescription.refillsUsed, allowed: prescription.refillsAllowed };
    }
    if (prescription.validUntil && new Date() > new Date(prescription.validUntil)) return { error: 'expired' };

    const billingItems = [];
    let subtotal = 0;
    for (const line of prescription.medicines) {
      const stockUpdate = await tx.medicine.updateMany({
        where: { id: line.medicineId, stockQuantity: { gte: line.quantity }, isActive: true },
        data: { stockQuantity: { decrement: line.quantity } },
      });
      if (stockUpdate.count !== 1) abortTransaction({ error: 'insufficient_stock', name: line.medicine.name });

      const unitPrice = line.medicine.unitPrice || 0;
      const amount = unitPrice * line.quantity;
      billingItems.push({
        description: `${line.medicine.name}${line.medicine.strength ? ` ${line.medicine.strength}` : ''}`,
        category: 'Medicine', quantity: line.quantity, unitPrice, amount,
      });
      subtotal += amount;
    }

    await tx.prescription.update({
      where: { id: prescription.id },
      data: { refillsUsed: { increment: 1 } },
    });
    const bill = await tx.billing.create({
      data: {
        sourceKey,
        patientId: prescription.patientId,
        subtotal,
        discount: 0,
        tax: 0,
        totalAmount: subtotal,
        balance: subtotal,
        billType: 'Pharmacy',
        createdByRole: 'Pharmacist',
        generatedById: req.user.id,
        notes: `Auto-generated refill - Rx ${prescription.prescriptionId}`,
        items: { create: billingItems },
      },
    });
    const updated = await loadPrescriptionForDispense(tx, prescription.id);
    return { updated, bill, replayed: false };
    });
  } catch (error) {
    if (error.code !== 'MEDILINK_BUSINESS_RULE') throw error;
    result = error.result;
  }

  if (result.error === 'not_found') return res.status(404).json({ success: false, message: 'Prescription not found' });
  if (result.error === 'not_fulfilled') return res.status(409).json({ success: false, message: 'The original prescription must be fully dispensed before refill' });
  if (result.error === 'no_refills') return res.status(409).json({ success: false, message: `No refills remaining. Used: ${result.used}/${result.allowed}` });
  if (result.error === 'expired') return res.status(409).json({ success: false, message: 'Prescription has expired. A new prescription is required.' });
  if (result.error === 'insufficient_stock') return res.status(409).json({ success: false, message: `Insufficient active stock for ${result.name}` });

  res.status(200).json({
    success: true,
    replayed: result.replayed,
    message: result.replayed
      ? 'This refill request was already completed; the original result was returned'
      : `Prescription refilled successfully. Refills remaining: ${result.updated.refillsAllowed - result.updated.refillsUsed}`,
    data: formatPopulatedRx(result.updated),
    bill: result.bill ? { ...result.bill, _id: result.bill.id } : null,
  });
};

const updatePrescription = async (req, res) => {
  let prescription = await prisma.prescription.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found',
    });
  }

  if (prescription.status !== 'Pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update prescription that has been processed',
    });
  }

  const updateData = {};
  if (req.body.diagnosis !== undefined) updateData.diagnosis = req.body.diagnosis;
  if (req.body.symptoms !== undefined) updateData.symptoms = req.body.symptoms;
  if (req.body.labTests) updateData.labTests = req.body.labTests;
  if (req.body.refillsAllowed !== undefined) updateData.refillsAllowed = parseInt(req.body.refillsAllowed);
  if (req.body.validUntil) updateData.validUntil = new Date(req.body.validUntil);
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;

  const updated = await prisma.prescription.update({
    where: { id: prescription.id },
    data: updateData,
    include: {
      patient: { select: { id: true, patientId: true } },
      doctor: { select: { id: true, specialization: true } },
      medicines: { include: { medicine: { select: { id: true, name: true, genericName: true, strength: true } } } },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Prescription updated successfully',
    data: formatPopulatedRx(updated),
  });
};

const cancelPrescription = async (req, res) => {
  const prescription = await prisma.prescription.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!prescription) {
    return res.status(404).json({
      success: false,
      message: 'Prescription not found',
    });
  }

  if (!canTransitionPrescription(prescription.status, 'Cancelled')) {
    return res.status(409).json({
      success: false,
      message: `Cannot cancel a prescription with status ${prescription.status}`,
    });
  }

  await prisma.prescription.update({
    where: { id: prescription.id },
    data: { status: 'Cancelled' },
  });

  res.status(200).json({
    success: true,
    message: 'Prescription cancelled successfully',
  });
};

const getPrescriptionStats = async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    include: { medicines: { include: { medicine: true } } },
  });

  const totalPrescriptions = prescriptions.length;
  const pending = prescriptions.filter((p) => p.status === 'Pending').length;
  const fulfilled = prescriptions.filter((p) => p.status === 'Fulfilled').length;
  const cancelled = prescriptions.filter((p) => p.status === 'Cancelled').length;

  const medCountMap = {};
  prescriptions.forEach((p) => {
    (p.medicines || []).forEach((m) => {
      if (m.medicine) {
        const name = m.medicine.name;
        if (!medCountMap[name]) medCountMap[name] = { medicineName: name, genericName: m.medicine.genericName, totalDispensed: 0 };
        medCountMap[name].totalDispensed += m.quantity;
      }
    });
  });

  const topMedicines = Object.values(medCountMap).sort((a, b) => b.totalDispensed - a.totalDispensed).slice(0, 10);

  res.status(200).json({
    success: true,
    data: {
      totalPrescriptions,
      statusBreakdown: { pending, fulfilled, cancelled },
      topMedicines,
    },
  });
};

module.exports = {
  createPrescription: asyncHandler(createPrescription),
  getPrescriptions: asyncHandler(getPrescriptions),
  updatePrescriptionStatus: asyncHandler(updatePrescriptionStatus),
  getPrescription: asyncHandler(getPrescription),
  refillPrescription: asyncHandler(refillPrescription),
  updatePrescription: asyncHandler(updatePrescription),
  cancelPrescription: asyncHandler(cancelPrescription),
  getPrescriptionStats: asyncHandler(getPrescriptionStats),
  dispensePrescription: asyncHandler(dispensePrescription),
};

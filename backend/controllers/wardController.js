const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const calcWardBill = (admissionDate, dailyRate) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.ceil((Date.now() - new Date(admissionDate).getTime()) / msPerDay));
  return { days, total: days * dailyRate };
};

const formatPopulatedWard = (w) => {
  if (!w) return null;
  return {
    ...w,
    _id: w.id,
    nurseInCharge: w.nurseInCharge ? { ...w.nurseInCharge, _id: w.nurseInCharge.id } : null,
    beds: (w.beds || []).map((b) => ({
      ...b,
      _id: b.id,
      patient: b.patient
        ? {
            ...b.patient,
            _id: b.patient.id,
            userId: b.patient.user ? { ...b.patient.user, _id: b.patient.user.id } : null,
          }
        : null,
    })),
  };
};

exports.createWard = asyncHandler(async (req, res) => {
  const { wardNumber, wardName, wardType, department, floor, totalBeds, gender, facilities, dailyRate } = req.body;

  const bedsData = [];
  for (let i = 1; i <= parseInt(totalBeds || 10); i++) {
    bedsData.push({
      bedNumber: `${wardNumber}-${String(i).padStart(2, '0')}`,
      isOccupied: false,
    });
  }

  const ward = await prisma.ward.create({
    data: {
      wardNumber,
      wardName,
      wardType: wardType || 'General',
      department: department || null,
      floor: floor ? parseInt(floor) : null,
      totalBeds: parseInt(totalBeds || 10),
      availableBeds: parseInt(totalBeds || 10),
      gender: gender || null,
      facilities: Array.isArray(facilities) ? facilities : [],
      dailyRate: parseFloat(dailyRate || 500),
      beds: {
        create: bedsData,
      },
    },
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  res.status(201).json({ success: true, data: formatPopulatedWard(ward) });
});

exports.getWards = asyncHandler(async (req, res) => {
  const { wardType, gender, available } = req.query;

  const where = { isActive: true };
  if (wardType) where.wardType = wardType;
  if (gender) where.gender = gender;
  if (available === 'true') where.availableBeds = { gt: 0 };

  const wards = await prisma.ward.findMany({
    where,
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
    orderBy: { wardNumber: 'asc' },
  });

  const formatted = wards.map(formatPopulatedWard);
  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

exports.getWard = asyncHandler(async (req, res) => {
  const ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true, email: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  res.status(200).json({ success: true, data: formatPopulatedWard(ward) });
});

exports.updateWard = asyncHandler(async (req, res) => {
  let ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });
  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  const data = {};
  if (req.body.wardName) data.wardName = req.body.wardName;
  if (req.body.wardType) data.wardType = req.body.wardType;
  if (req.body.department !== undefined) data.department = req.body.department;
  if (req.body.floor !== undefined) data.floor = parseInt(req.body.floor);
  if (req.body.gender) data.gender = req.body.gender;
  if (req.body.facilities) data.facilities = req.body.facilities;
  if (req.body.dailyRate !== undefined) data.dailyRate = parseFloat(req.body.dailyRate);

  const updated = await prisma.ward.update({
    where: { id: ward.id },
    data,
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  res.status(200).json({ success: true, data: formatPopulatedWard(updated) });
});

exports.deleteWard = asyncHandler(async (req, res) => {
  const ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });
  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  const occupiedBeds = await prisma.bed.count({ where: { wardId: ward.id, isOccupied: true } });
  if (occupiedBeds > 0) {
    return res.status(400).json({ message: 'Cannot delete ward with occupied beds' });
  }

  await prisma.ward.update({ where: { id: ward.id }, data: { isActive: false } });
  res.status(200).json({ success: true, message: 'Ward archived' });
});

exports.allocateBed = asyncHandler(async (req, res) => {
  const { patientId, admissionDate, expectedDischargeDate } = req.body;

  const ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: { beds: true },
  });
  if (!ward) return res.status(404).json({ message: 'Ward not found' });
  if (ward.availableBeds === 0) return res.status(400).json({ message: 'No beds available' });

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { legacyMongoId: patientId }] },
  });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });

  const availableBed = ward.beds.find((b) => !b.isOccupied);
  if (!availableBed) return res.status(400).json({ message: 'No beds available' });

  const admDate = admissionDate ? new Date(admissionDate) : new Date();
  const expDate = expectedDischargeDate ? new Date(expectedDischargeDate) : null;

  await prisma.bed.update({
    where: { id: availableBed.id },
    data: {
      isOccupied: true,
      patientId: patient.id,
      admissionDate: admDate,
      expectedDischargeDate: expDate,
    },
  });

  await prisma.ward.update({
    where: { id: ward.id },
    data: { availableBeds: Math.max(0, ward.availableBeds - 1) },
  });

  await prisma.admissionHistory.create({
    data: {
      patientId: patient.id,
      admissionDate: admDate,
      ward: ward.wardName,
    },
  });

  const updatedWard = await prisma.ward.findUnique({
    where: { id: ward.id },
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  res.status(200).json({ success: true, data: formatPopulatedWard(updatedWard) });
});

exports.releaseBed = asyncHandler(async (req, res) => {
  const { bedNumber } = req.body;

  const ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: { beds: true },
  });
  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  const bed = ward.beds.find((b) => b.bedNumber === bedNumber);
  if (!bed || !bed.isOccupied) {
    return res.status(400).json({ message: 'Bed not found or not occupied' });
  }

  let wardBill = null;
  if (bed.patientId) {
    const lastAdmission = await prisma.admissionHistory.findFirst({
      where: { patientId: bed.patientId, dischargeDate: null },
      orderBy: { admissionDate: 'desc' },
    });

    if (lastAdmission) {
      await prisma.admissionHistory.update({
        where: { id: lastAdmission.id },
        data: { dischargeDate: new Date() },
      });
    }

    if (bed.admissionDate && ward.dailyRate > 0) {
      const { days, total } = calcWardBill(bed.admissionDate, ward.dailyRate);
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const ts = Date.now().toString(36).toUpperCase().slice(-4);
      const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
      const billNumber = `BILL-${year}${month}-${ts}${rand}`;

      wardBill = await prisma.billing.create({
        data: {
          billNumber,
          patientId: bed.patientId,
          billType: 'Ward',
          subtotal: total,
          totalAmount: total,
          balance: total,
          notes: `Auto-generated on discharge. Admission: ${new Date(bed.admissionDate).toLocaleDateString('en-IN')} · ${days} day(s) @ ₹${ward.dailyRate}/day`,
          items: {
            create: [
              {
                description: `Ward Stay — ${ward.wardName} (${ward.wardType}) · ${bed.bedNumber}`,
                category: 'Room_Charges',
                quantity: days,
                unitPrice: ward.dailyRate,
                amount: total,
              },
            ],
          },
        },
      });
    }
  }

  await prisma.bed.update({
    where: { id: bed.id },
    data: {
      isOccupied: false,
      patientId: null,
      admissionDate: null,
      expectedDischargeDate: null,
    },
  });

  await prisma.ward.update({
    where: { id: ward.id },
    data: { availableBeds: Math.min(ward.totalBeds, ward.availableBeds + 1) },
  });

  const updatedWard = await prisma.ward.findUnique({
    where: { id: ward.id },
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  res.status(200).json({ success: true, data: formatPopulatedWard(updatedWard), wardBill: wardBill ? { ...wardBill, _id: wardBill.id } : null });
});

exports.assignBed = asyncHandler(async (req, res) => {
  const { patientId, bedId, admissionDate, expectedDischargeDate } = req.body;

  if (!patientId || !bedId) {
    return res.status(400).json({ success: false, message: 'patientId and bedId are required' });
  }

  const ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: { beds: true },
  });
  if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

  const bed = ward.beds.find((b) => b.id === bedId);
  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
  if (bed.isOccupied) {
    return res.status(400).json({ success: false, message: 'Bed is already occupied' });
  }

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: patientId }, { legacyMongoId: patientId }] },
  });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  const alreadyAssigned = await prisma.bed.findFirst({
    where: { patientId: patient.id, isOccupied: true },
  });
  if (alreadyAssigned) {
    return res.status(400).json({ success: false, message: 'Patient is already assigned to a bed' });
  }

  const admDate = admissionDate ? new Date(admissionDate) : new Date();
  const expDate = expectedDischargeDate ? new Date(expectedDischargeDate) : null;

  await prisma.bed.update({
    where: { id: bed.id },
    data: {
      isOccupied: true,
      patientId: patient.id,
      admissionDate: admDate,
      expectedDischargeDate: expDate,
    },
  });

  await prisma.ward.update({
    where: { id: ward.id },
    data: { availableBeds: Math.max(0, ward.availableBeds - 1) },
  });

  await prisma.admissionHistory.create({
    data: {
      patientId: patient.id,
      admissionDate: admDate,
      ward: ward.wardName,
    },
  });

  const updatedWard = await prisma.ward.findUnique({
    where: { id: ward.id },
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  res.status(200).json({ success: true, message: 'Patient assigned to bed', data: formatPopulatedWard(updatedWard) });
});

exports.dischargeBed = asyncHandler(async (req, res) => {
  const { bedId } = req.body;
  if (!bedId) {
    return res.status(400).json({ success: false, message: 'bedId is required' });
  }

  const ward = await prisma.ward.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: { beds: true },
  });
  if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

  const bed = ward.beds.find((b) => b.id === bedId);
  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
  if (!bed.isOccupied) {
    return res.status(400).json({ success: false, message: 'Bed is not occupied' });
  }

  let wardBill = null;
  if (bed.patientId) {
    const lastAdmission = await prisma.admissionHistory.findFirst({
      where: { patientId: bed.patientId, dischargeDate: null },
      orderBy: { admissionDate: 'desc' },
    });

    if (lastAdmission) {
      await prisma.admissionHistory.update({
        where: { id: lastAdmission.id },
        data: { dischargeDate: new Date() },
      });
    }

    if (bed.admissionDate && ward.dailyRate > 0) {
      const { days, total } = calcWardBill(bed.admissionDate, ward.dailyRate);
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const ts = Date.now().toString(36).toUpperCase().slice(-4);
      const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
      const billNumber = `BILL-${year}${month}-${ts}${rand}`;

      wardBill = await prisma.billing.create({
        data: {
          billNumber,
          patientId: bed.patientId,
          billType: 'Ward',
          subtotal: total,
          totalAmount: total,
          balance: total,
          notes: `Auto-generated on discharge. Admission: ${new Date(bed.admissionDate).toLocaleDateString('en-IN')} · ${days} day(s) @ ₹${ward.dailyRate}/day`,
          items: {
            create: [
              {
                description: `Ward Stay — ${ward.wardName} (${ward.wardType}) · ${bed.bedNumber}`,
                category: 'Room_Charges',
                quantity: days,
                unitPrice: ward.dailyRate,
                amount: total,
              },
            ],
          },
        },
      });
    }
  }

  await prisma.bed.update({
    where: { id: bed.id },
    data: {
      isOccupied: false,
      patientId: null,
      admissionDate: null,
      expectedDischargeDate: null,
    },
  });

  await prisma.ward.update({
    where: { id: ward.id },
    data: { availableBeds: Math.min(ward.totalBeds, ward.availableBeds + 1) },
  });

  const updatedWard = await prisma.ward.findUnique({
    where: { id: ward.id },
    include: {
      nurseInCharge: { select: { id: true, name: true, phone: true } },
      beds: { include: { patient: { include: { user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } } } } } },
    },
  });

  res.status(200).json({ success: true, message: 'Patient discharged successfully', data: formatPopulatedWard(updatedWard), wardBill: wardBill ? { ...wardBill, _id: wardBill.id } : null });
});

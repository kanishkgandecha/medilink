const { runSerializableTransaction, abortTransaction } = require('../utils/transactions');

const wardInclude = {
  nurseInCharge: { select: { id: true, name: true, phone: true } },
  beds: {
    include: {
      patient: {
        include: {
          user: { select: { id: true, name: true, dateOfBirth: true, gender: true, phone: true } },
        },
      },
    },
  },
};

const wardWhere = (identifier) => ({ OR: [{ id: identifier }, { legacyMongoId: identifier }] });

const calculateWardCharge = (admissionDate, dailyRate) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const days = Math.max(1, Math.ceil((Date.now() - new Date(admissionDate).getTime()) / millisecondsPerDay));
  return { days, total: days * dailyRate };
};

const reconcileAvailability = async (tx, wardId, totalBeds) => {
  const occupiedBeds = await tx.bed.count({ where: { wardId, isOccupied: true } });
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  await tx.ward.update({ where: { id: wardId }, data: { availableBeds } });
};

const assignBedTransaction = async ({ wardIdentifier, patientIdentifier, bedIdentifier, admissionDate, expectedDischargeDate }) => {
  try {
    return await runSerializableTransaction(async (tx) => {
      const ward = await tx.ward.findFirst({ where: wardWhere(wardIdentifier), include: { beds: true } });
      if (!ward || !ward.isActive) return { error: 'ward_not_found' };

      const patient = await tx.patient.findFirst({
        where: { OR: [{ id: patientIdentifier }, { legacyMongoId: patientIdentifier }] },
      });
      if (!patient) return { error: 'patient_not_found' };

      const existing = await tx.bed.findFirst({ where: { patientId: patient.id, isOccupied: true } });
      if (existing) {
        if (existing.wardId === ward.id && (!bedIdentifier || existing.id === bedIdentifier)) {
          const currentWard = await tx.ward.findUnique({ where: { id: existing.wardId }, include: wardInclude });
          return { ward: currentWard, replayed: true };
        }
        return { error: 'patient_already_assigned' };
      }

      const bed = bedIdentifier
        ? ward.beds.find((candidate) => candidate.id === bedIdentifier)
        : ward.beds.find((candidate) => !candidate.isOccupied);
      if (!bed) return { error: 'bed_not_found' };
      if (bed.isOccupied) return { error: 'bed_occupied' };

      const admittedAt = admissionDate ? new Date(admissionDate) : new Date();
      const expectedAt = expectedDischargeDate ? new Date(expectedDischargeDate) : null;
      if (expectedAt && expectedAt <= admittedAt) return { error: 'invalid_dates' };

      const claimed = await tx.bed.updateMany({
        where: { id: bed.id, wardId: ward.id, isOccupied: false, patientId: null },
        data: {
          isOccupied: true,
          patientId: patient.id,
          admissionDate: admittedAt,
          expectedDischargeDate: expectedAt,
        },
      });
      if (claimed.count !== 1) abortTransaction({ error: 'bed_occupied' });

      await tx.admissionHistory.create({
        data: { patientId: patient.id, admissionDate: admittedAt, ward: ward.wardName },
      });
      await reconcileAvailability(tx, ward.id, ward.totalBeds);
      const updatedWard = await tx.ward.findUnique({ where: { id: ward.id }, include: wardInclude });
      return { ward: updatedWard, replayed: false };
    });
  } catch (error) {
    if (error.code === 'MEDILINK_BUSINESS_RULE') return error.result;
    throw error;
  }
};

const dischargeBedTransaction = async ({ wardIdentifier, bedIdentifier, bedNumber, idempotencyKey, actorId }) => {
  try {
    return await runSerializableTransaction(async (tx) => {
      const ward = await tx.ward.findFirst({ where: wardWhere(wardIdentifier), include: { beds: true } });
      if (!ward) return { error: 'ward_not_found' };
      const bed = ward.beds.find((candidate) =>
        bedIdentifier ? candidate.id === bedIdentifier : candidate.bedNumber === bedNumber
      );
      if (!bed) return { error: 'bed_not_found' };

      const sourceKey = `bed:${bed.id}:discharge:${idempotencyKey}`;
      const existingBill = await tx.billing.findUnique({ where: { sourceKey } });
      if (existingBill) {
        const updatedWard = await tx.ward.findUnique({ where: { id: ward.id }, include: wardInclude });
        return { ward: updatedWard, bill: existingBill, replayed: true };
      }
      if (!bed.isOccupied || !bed.patientId) return { error: 'bed_not_occupied' };

      const released = await tx.bed.updateMany({
        where: { id: bed.id, wardId: ward.id, isOccupied: true, patientId: bed.patientId },
        data: { isOccupied: false, patientId: null, admissionDate: null, expectedDischargeDate: null },
      });
      if (released.count !== 1) abortTransaction({ error: 'bed_not_occupied' });

      const admission = await tx.admissionHistory.findFirst({
        where: { patientId: bed.patientId, dischargeDate: null },
        orderBy: { admissionDate: 'desc' },
      });
      if (admission) {
        await tx.admissionHistory.update({ where: { id: admission.id }, data: { dischargeDate: new Date() } });
      }

      let bill = null;
      if (bed.admissionDate && ward.dailyRate > 0) {
        const { days, total } = calculateWardCharge(bed.admissionDate, ward.dailyRate);
        bill = await tx.billing.create({
          data: {
            sourceKey,
            patientId: bed.patientId,
            billType: 'Ward',
            subtotal: total,
            totalAmount: total,
            balance: total,
            generatedById: actorId,
            notes: `Auto-generated on discharge - ${days} day(s) at ${ward.dailyRate}/day`,
            items: {
              create: [{
                description: `Ward stay - ${ward.wardName} (${ward.wardType}) - ${bed.bedNumber}`,
                category: 'Room_Charges', quantity: days, unitPrice: ward.dailyRate, amount: total,
              }],
            },
          },
        });
      }

      await reconcileAvailability(tx, ward.id, ward.totalBeds);
      const updatedWard = await tx.ward.findUnique({ where: { id: ward.id }, include: wardInclude });
      return { ward: updatedWard, bill, replayed: false };
    });
  } catch (error) {
    if (error.code === 'MEDILINK_BUSINESS_RULE') return error.result;
    throw error;
  }
};

module.exports = { assignBedTransaction, dischargeBedTransaction };

const asyncHandler = require('../utils/asyncHandler');
const { assignBedTransaction, dischargeBedTransaction } = require('../services/wardBedService');

const formatWard = (ward) => ({
  ...ward,
  _id: ward.id,
  beds: (ward.beds || []).map((bed) => ({ ...bed, _id: bed.id })),
});

const sendAssignmentError = (res, result) => {
  const errors = {
    ward_not_found: [404, 'Ward not found or inactive'],
    patient_not_found: [404, 'Patient not found'],
    bed_not_found: [404, 'No matching available bed was found'],
    bed_occupied: [409, 'Bed is already occupied'],
    patient_already_assigned: [409, 'Patient is already assigned to another bed'],
    invalid_dates: [400, 'Expected discharge must be after admission'],
  };
  const [status, message] = errors[result.error] || [400, 'Bed assignment failed'];
  return res.status(status).json({ success: false, message });
};

exports.assignBed = asyncHandler(async (req, res) => {
  const result = await assignBedTransaction({
    wardIdentifier: req.params.id,
    patientIdentifier: req.body.patientId,
    bedIdentifier: req.body.bedId,
    admissionDate: req.body.admissionDate,
    expectedDischargeDate: req.body.expectedDischargeDate,
  });
  if (result.error) return sendAssignmentError(res, result);
  return res.status(200).json({
    success: true,
    replayed: result.replayed,
    message: result.replayed ? 'Patient is already assigned to this bed' : 'Patient assigned to bed',
    data: formatWard(result.ward),
  });
});

exports.dischargeBed = asyncHandler(async (req, res) => {
  const result = await dischargeBedTransaction({
    wardIdentifier: req.params.id,
    bedIdentifier: req.body.bedId,
    bedNumber: req.body.bedNumber,
    idempotencyKey: req.body.idempotencyKey,
    actorId: req.user.id,
  });
  if (result.error) {
    const status = result.error === 'ward_not_found' || result.error === 'bed_not_found' ? 404 : 409;
    const message = result.error === 'bed_not_occupied' ? 'Bed is not occupied' : 'Ward or bed not found';
    return res.status(status).json({ success: false, message });
  }
  return res.status(200).json({
    success: true,
    replayed: result.replayed,
    message: result.replayed ? 'This discharge request was already completed' : 'Patient discharged successfully',
    data: formatWard(result.ward),
    wardBill: result.bill ? { ...result.bill, _id: result.bill.id } : null,
  });
});

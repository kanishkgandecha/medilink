const Ward = require('../models/Ward');
const Patient = require('../models/Patient');
const asyncHandler = require('../utils/asyncHandler');

// Populate helper — used in multiple places
const bedPatientPopulate = {
  path: 'beds.patient',
  model: 'Patient',
  populate: { path: 'userId', select: 'name dateOfBirth gender phone' }
};

exports.createWard = asyncHandler(async (req, res) => {
  const { wardNumber, wardName, wardType, department, floor, totalBeds,
          gender, facilities, dailyRate } = req.body;

  const beds = [];
  for (let i = 1; i <= totalBeds; i++) {
    beds.push({
      bedNumber: `${wardNumber}-${String(i).padStart(2, '0')}`,
      isOccupied: false
    });
  }

  const ward = await Ward.create({
    wardNumber, wardName, wardType, department, floor, totalBeds,
    availableBeds: totalBeds, beds, gender, facilities, dailyRate
  });

  res.status(201).json({ success: true, data: ward });
});

exports.getWards = asyncHandler(async (req, res) => {
  const { wardType, gender, available } = req.query;

  let query = { isActive: true };
  if (wardType) query.wardType = wardType;
  if (gender)   query.gender   = gender;
  if (available === 'true') query.availableBeds = { $gt: 0 };

  const wards = await Ward.find(query)
    .populate('nurseInCharge', 'name phone')
    .populate(bedPatientPopulate);

  res.status(200).json({ success: true, count: wards.length, data: wards });
});

exports.getWard = asyncHandler(async (req, res) => {
  const ward = await Ward.findById(req.params.id)
    .populate('nurseInCharge', 'name phone email')
    .populate(bedPatientPopulate);

  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  res.status(200).json({ success: true, data: ward });
});

exports.updateWard = asyncHandler(async (req, res) => {
  let ward = await Ward.findById(req.params.id);
  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  ward = await Ward.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true
  });

  res.status(200).json({ success: true, data: ward });
});

exports.deleteWard = asyncHandler(async (req, res) => {
  const ward = await Ward.findById(req.params.id);
  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  if (ward.availableBeds !== ward.totalBeds) {
    return res.status(400).json({ message: 'Cannot delete ward with occupied beds' });
  }

  await ward.deleteOne();
  res.status(200).json({ success: true, message: 'Ward deleted' });
});

// ── Existing: auto-assign next available bed in a ward ───────────────────────
exports.allocateBed = asyncHandler(async (req, res) => {
  const { patientId, admissionDate, expectedDischargeDate } = req.body;

  const ward = await Ward.findById(req.params.id);
  if (!ward)  return res.status(404).json({ message: 'Ward not found' });
  if (ward.availableBeds === 0) return res.status(400).json({ message: 'No beds available' });

  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });

  const availableBed = ward.beds.find(bed => !bed.isOccupied);
  if (!availableBed) return res.status(400).json({ message: 'No beds available' });

  availableBed.isOccupied = true;
  availableBed.patient    = patientId;
  availableBed.admissionDate         = admissionDate || new Date();
  availableBed.expectedDischargeDate = expectedDischargeDate;

  ward.availableBeds -= 1;
  await ward.save();

  patient.admissionHistory = patient.admissionHistory || [];
  patient.admissionHistory.push({ admissionDate: availableBed.admissionDate, ward: ward.wardName });
  await patient.save();

  await ward.populate(bedPatientPopulate);
  res.status(200).json({ success: true, data: ward });
});

// ── Existing: release bed by bedNumber string ────────────────────────────────
exports.releaseBed = asyncHandler(async (req, res) => {
  const { bedNumber } = req.body;

  const ward = await Ward.findById(req.params.id);
  if (!ward) return res.status(404).json({ message: 'Ward not found' });

  const bed = ward.beds.find(b => b.bedNumber === bedNumber);
  if (!bed || !bed.isOccupied) {
    return res.status(400).json({ message: 'Bed not found or not occupied' });
  }

  if (bed.patient) {
    const patient = await Patient.findById(bed.patient);
    if (patient) {
      const admission = patient.admissionHistory?.[patient.admissionHistory.length - 1];
      if (admission && !admission.dischargeDate) {
        admission.dischargeDate = new Date();
        await patient.save();
      }
    }
  }

  bed.isOccupied = false;
  bed.patient    = null;
  bed.admissionDate = null;
  bed.expectedDischargeDate = null;

  ward.availableBeds += 1;
  await ward.save();

  res.status(200).json({ success: true, data: ward });
});

// ── NEW: assign a SPECIFIC bed (by beds._id) to a patient ────────────────────
exports.assignBed = asyncHandler(async (req, res) => {
  const { patientId, bedId, admissionDate, expectedDischargeDate } = req.body;

  if (!patientId || !bedId) {
    return res.status(400).json({ success: false, message: 'patientId and bedId are required' });
  }

  const ward = await Ward.findById(req.params.id);
  if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

  // Validate bed exists and is free
  const bed = ward.beds.id(bedId);
  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
  if (bed.isOccupied) {
    return res.status(400).json({ success: false, message: 'Bed is already occupied' });
  }

  // Validate patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  // Prevent assigning same patient to multiple beds across all wards
  const alreadyAssigned = await Ward.findOne({ 'beds.patient': patientId, 'beds.isOccupied': true });
  if (alreadyAssigned) {
    return res.status(400).json({ success: false, message: 'Patient is already assigned to a bed' });
  }

  bed.isOccupied = true;
  bed.patient    = patientId;
  bed.admissionDate         = admissionDate ? new Date(admissionDate) : new Date();
  bed.expectedDischargeDate = expectedDischargeDate ? new Date(expectedDischargeDate) : null;

  ward.availableBeds = Math.max(0, ward.availableBeds - 1);
  await ward.save();

  // Log admission in patient history
  patient.admissionHistory = patient.admissionHistory || [];
  patient.admissionHistory.push({ admissionDate: bed.admissionDate, ward: ward.wardName });
  await patient.save();

  await ward.populate(bedPatientPopulate);
  res.status(200).json({ success: true, message: 'Patient assigned to bed', data: ward });
});

// ── NEW: discharge patient from a SPECIFIC bed (by beds._id) ─────────────────
exports.dischargeBed = asyncHandler(async (req, res) => {
  const { bedId } = req.body;

  if (!bedId) {
    return res.status(400).json({ success: false, message: 'bedId is required' });
  }

  const ward = await Ward.findById(req.params.id);
  if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });

  const bed = ward.beds.id(bedId);
  if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
  if (!bed.isOccupied) {
    return res.status(400).json({ success: false, message: 'Bed is not occupied' });
  }

  // Close patient admission history
  if (bed.patient) {
    const patient = await Patient.findById(bed.patient);
    if (patient) {
      const lastAdmission = patient.admissionHistory?.[patient.admissionHistory.length - 1];
      if (lastAdmission && !lastAdmission.dischargeDate) {
        lastAdmission.dischargeDate = new Date();
        await patient.save();
      }
    }
  }

  bed.isOccupied = false;
  bed.patient    = null;
  bed.admissionDate = null;
  bed.expectedDischargeDate = null;

  ward.availableBeds = Math.min(ward.totalBeds, ward.availableBeds + 1);
  await ward.save();

  await ward.populate(bedPatientPopulate);
  res.status(200).json({ success: true, message: 'Patient discharged successfully', data: ward });
});

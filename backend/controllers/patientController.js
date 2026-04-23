const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const asyncHandler = require('../utils/asyncHandler');

// Helper function to generate unique patient ID
const generatePatientId = async () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const patientId = `PAT${timestamp}${random}`;
  
  const exists = await Patient.findOne({ patientId });
  if (exists) {
    return generatePatientId();
  }
  
  return patientId;
};

// Get users with role "Patient" who don't have a patient profile yet
exports.getAvailablePatientUsers = asyncHandler(async (req, res) => {
  // Get all patient users
  const patientUsers = await User.find({ role: 'Patient' }).select('_id name email phone dateOfBirth gender');
  
  // Get all existing patient profiles
  const existingPatients = await Patient.find().select('userId');
  const existingUserIds = existingPatients.map(p => p.userId.toString());
  
  // Filter out users who already have patient profiles
  const availableUsers = patientUsers.filter(user => !existingUserIds.includes(user._id.toString()));
  
  res.status(200).json({
    success: true,
    count: availableUsers.length,
    data: availableUsers
  });
});

// Create patient profile (supports atomic user+profile creation)
exports.createPatient = asyncHandler(async (req, res) => {
  const { userId, name, email, phone, gender, dateOfBirth,
          bloodGroup, emergencyContact, allergies, insuranceInfo } = req.body;

  let targetUser;

  if (userId) {
    // Legacy flow: link existing User
    targetUser = await User.findById(userId);
    if (!targetUser || targetUser.role !== 'Patient') {
      return res.status(400).json({ success: false, message: 'Invalid user or not a Patient role' });
    }
  } else {
    // New atomic flow: create User + Patient profile together
    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
    }
    const duplicate = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
    if (duplicate) {
      const field = duplicate.email === email.toLowerCase() ? 'Email' : 'Phone number';
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }
    targetUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: phone, // bcrypt pre-save hook hashes this
      role: 'Patient',
      phone,
      ...(gender && { gender }),
      ...(dateOfBirth && { dateOfBirth })
    });
  }

  const existingPatient = await Patient.findOne({ userId: targetUser._id });
  if (existingPatient) {
    return res.status(400).json({ success: false, message: 'Patient profile already exists for this user' });
  }

  const patientId = await generatePatientId();

  const patient = await Patient.create({
    userId: targetUser._id,
    patientId,
    bloodGroup,
    emergencyContact,
    allergies: allergies || [],
    insuranceInfo: insuranceInfo || {}
  });

  await patient.populate('userId', 'name email phone address dateOfBirth gender');

  res.status(201).json({
    success: true,
    message: userId
      ? 'Patient profile created successfully'
      : 'Patient created successfully. Default password is the phone number.',
    data: patient
  });
});

// Get all patients (Patient role only sees their own profile)
exports.getPatients = asyncHandler(async (req, res) => {
  // Patient role: return only their own profile
  if (req.user.role === 'Patient') {
    const patient = await Patient.findOne({ userId: req.user._id })
      .populate('userId', 'name email phone address dateOfBirth gender');
    return res.status(200).json({
      success: true,
      count: patient ? 1 : 0,
      data: patient ? [patient] : [],
    });
  }

  const { search, bloodGroup, page = 1, limit = 10 } = req.query;

  let query = {};
  
  if (bloodGroup) {
    query.bloodGroup = bloodGroup;
  }
  
  if (search) {
    const users = await User.find({
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ]
    }).select('_id');
    
    const userIds = users.map(user => user._id);
    
    query.$or = [
      { patientId: new RegExp(search, 'i') },
      { userId: { $in: userIds } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const patients = await Patient.find(query)
    .populate('userId', 'name email phone address dateOfBirth gender')
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ createdAt: -1 });
  
  const total = await Patient.countDocuments(query);

  res.status(200).json({ 
    success: true, 
    count: patients.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: patients 
  });
});

// Get single patient
exports.getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate('userId', 'name email phone address dateOfBirth gender');
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  res.status(200).json({ 
    success: true, 
    data: patient 
  });
});

// Get patient medical records (history + lab reports)
exports.getPatientMedicalRecords = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate('userId', 'name email phone dateOfBirth gender')
    .select('patientId medicalHistory labReports allergies currentMedications');
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  res.status(200).json({ 
    success: true, 
    data: patient 
  });
});

// Get patient appointments
exports.getPatientAppointments = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  const appointments = await Appointment.find({ patient: req.params.id })
    .populate({
      path: 'doctor',
      select: 'userId specialization',
      populate: { path: 'userId', select: 'name' }
    })
    .populate('patient', 'patientId')
    .sort({ appointmentDate: -1 });

  res.status(200).json({ 
    success: true, 
    count: appointments.length,
    data: appointments 
  });
});

// Update patient
exports.updatePatient = asyncHandler(async (req, res) => {
  let patient = await Patient.findById(req.params.id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  delete req.body.userId;
  delete req.body.patientId;

  patient = await Patient.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  ).populate('userId', 'name email phone address dateOfBirth gender');

  res.status(200).json({ 
    success: true, 
    message: 'Patient updated successfully',
    data: patient 
  });
});

// Delete patient
exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  if (patient.userId) {
    await User.deleteOne({ _id: patient.userId });
  }
  await patient.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Patient deleted successfully'
  });
});

// Add medical history
exports.addMedicalHistory = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  const { condition, diagnosedDate, status } = req.body;
  if (!condition || !diagnosedDate || !status) {
    return res.status(400).json({
      success: false,
      message: 'Condition, diagnosed date, and status are required'
    });
  }

  patient.medicalHistory.push(req.body);
  await patient.save();

  res.status(200).json({ 
    success: true,
    message: 'Medical history added successfully',
    data: patient 
  });
});

// Update medical history
exports.updateMedicalHistory = asyncHandler(async (req, res) => {
  const { id, historyId } = req.params;
  
  const patient = await Patient.findById(id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  const historyItem = patient.medicalHistory.id(historyId);
  
  if (!historyItem) {
    return res.status(404).json({
      success: false,
      message: 'Medical history item not found'
    });
  }

  Object.assign(historyItem, req.body);
  await patient.save();

  res.status(200).json({
    success: true,
    message: 'Medical history updated successfully',
    data: patient
  });
});

// Delete medical history
exports.deleteMedicalHistory = asyncHandler(async (req, res) => {
  const { id, historyId } = req.params;
  
  const patient = await Patient.findById(id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  patient.medicalHistory.pull(historyId);
  await patient.save();

  res.status(200).json({
    success: true,
    message: 'Medical history deleted successfully',
    data: patient
  });
});

// Add lab report
exports.addLabReport = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  
  if (!patient) {
    return res.status(404).json({ 
      success: false,
      message: 'Patient not found' 
    });
  }

  const { testName } = req.body;
  if (!testName) {
    return res.status(400).json({
      success: false,
      message: 'Test name is required'
    });
  }

  patient.labReports.push(req.body);
  await patient.save();

  res.status(200).json({ 
    success: true,
    message: 'Lab report added successfully',
    data: patient 
  });
});

// Get patient stats
exports.getPatientStats = asyncHandler(async (req, res) => {
  const patientId = req.params.id;
  
  const patient = await Patient.findById(patientId)
    .populate('userId', 'name email');
  
  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found'
    });
  }

  const appointmentCount = await Appointment.countDocuments({ patient: patientId });

  const Prescription = require('../models/Prescription');
  const prescriptionCount = await Prescription.countDocuments({ patient: patientId });

  const Billing = require('../models/Billing');
  const billings = await Billing.find({ patient: patientId });
  const totalBilled = billings.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalPaid = billings.reduce((sum, bill) => sum + bill.amountPaid, 0);

  res.status(200).json({
    success: true,
    data: {
      patient,
      stats: {
        totalAppointments: appointmentCount,
        totalPrescriptions: prescriptionCount,
        totalBilled,
        totalPaid,
        outstandingBalance: totalBilled - totalPaid,
        medicalHistoryCount: patient.medicalHistory.length,
        labReportsCount: patient.labReports.length,
        allergiesCount: patient.allergies.length
      }
    }
  });
});
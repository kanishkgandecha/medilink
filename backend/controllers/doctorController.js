const Doctor = require('../models/Doctor');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Get users with role "Doctor" who don't have a doctor profile yet
exports.getAvailableDoctorUsers = asyncHandler(async (req, res) => {
  // Get all doctor users
  const doctorUsers = await User.find({ role: 'Doctor' }).select('_id name email phone');
  
  // Get all existing doctor profiles
  const existingDoctors = await Doctor.find().select('userId');
  const existingUserIds = existingDoctors.map(d => d.userId.toString());
  
  // Filter out users who already have doctor profiles
  const availableUsers = doctorUsers.filter(user => !existingUserIds.includes(user._id.toString()));
  
  res.status(200).json({
    success: true,
    count: availableUsers.length,
    data: availableUsers
  });
});

exports.createDoctor = asyncHandler(async (req, res) => {
  const { userId, name, email, phone, gender, dateOfBirth,
          specialization, qualification, experience, licenseNumber,
          department, consultationFee, availability } = req.body;

  let targetUser;

  if (userId) {
    // Legacy: link an existing User account to a Doctor profile
    targetUser = await User.findById(userId);
    if (!targetUser || targetUser.role !== 'Doctor') {
      return res.status(400).json({ success: false, message: 'Invalid user or not a Doctor role' });
    }
  } else {
    // New: create User + Doctor profile atomically
    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
    }
    const duplicate = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });
    if (duplicate) {
      const field = duplicate.email === email.toLowerCase() ? 'Email' : 'Phone';
      return res.status(409).json({ success: false, message: `${field} already registered` });
    }
    // password = phone — bcrypt pre-save hook hashes it automatically
    targetUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: phone,
      role: 'Doctor',
      phone,
      ...(gender && { gender }),
      ...(dateOfBirth && { dateOfBirth })
    });
  }

  const existingDoctor = await Doctor.findOne({ userId: targetUser._id });
  if (existingDoctor) {
    return res.status(400).json({ success: false, message: 'Doctor profile already exists for this user' });
  }

  const finalLicense = licenseNumber || `LIC${Date.now().toString().slice(-8)}`;

  const doctor = await Doctor.create({
    userId: targetUser._id,
    specialization,
    qualification: qualification || 'MBBS',
    experience: parseInt(experience) || 0,
    licenseNumber: finalLicense,
    department: department || specialization,
    consultationFee: parseFloat(consultationFee) || 0,
    availability: availability || []
  });

  await doctor.populate('userId', 'name email phone gender dateOfBirth');

  res.status(201).json({
    success: true,
    message: 'Doctor created successfully. Default password is the phone number.',
    data: doctor
  });
});

exports.getDoctors = asyncHandler(async (req, res) => {
  const { specialization, department, isAvailable, search, page = 1, limit = 10 } = req.query;
  
  let query = {};
  
  if (specialization) query.specialization = specialization;
  if (department) query.department = department;
  if (isAvailable) query.isAvailable = isAvailable === 'true';

  // Search functionality
  if (search) {
    const users = await User.find({
      $or: [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ]
    }).select('_id');
    
    const userIds = users.map(user => user._id);
    
    query.$or = [
      { licenseNumber: new RegExp(search, 'i') },
      { userId: { $in: userIds } }
    ];
  }

  const skip = (page - 1) * limit;

  const doctors = (await Doctor.find(query)
    .populate('userId', 'name email phone address dateOfBirth gender')
    .limit(parseInt(limit))
    .skip(skip)
    .sort({ createdAt: -1 }))
    .filter(d => d.userId !== null); // exclude orphaned records

  const total = await Doctor.countDocuments({ ...query, userId: { $ne: null } });

  res.status(200).json({ 
    success: true, 
    count: doctors.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / limit),
    data: doctors 
  });
});

exports.getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate('userId', 'name email phone address dateOfBirth gender');
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  res.status(200).json({ 
    success: true, 
    data: doctor 
  });
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  let doctor = await Doctor.findById(req.params.id);
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  // Prevent updating userId
  delete req.body.userId;

  doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('userId', 'name email phone address dateOfBirth gender');

  res.status(200).json({ 
    success: true,
    message: 'Doctor updated successfully',
    data: doctor 
  });
});

exports.deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  if (doctor.userId) {
    await User.deleteOne({ _id: doctor.userId });
  }
  await doctor.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Doctor deleted successfully'
  });
});

exports.updateAvailability = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    { availability: req.body.availability },
    { new: true, runValidators: true }
  ).populate('userId', 'name email phone');

  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  res.status(200).json({ 
    success: true,
    message: 'Availability updated successfully',
    data: doctor 
  });
});

exports.addOnCallShift = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  doctor.onCallShifts.push(req.body);
  await doctor.save();

  res.status(200).json({ 
    success: true,
    message: 'On-call shift added successfully',
    data: doctor 
  });
});

// Get doctor's schedule/availability
exports.getDoctorSchedule = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id)
    .populate('userId', 'name email')
    .select('availability onCallShifts');
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  res.status(200).json({ 
    success: true, 
    data: doctor 
  });
});

// Get doctor's appointments
exports.getDoctorAppointments = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false,
      message: 'Doctor not found' 
    });
  }

  const Appointment = require('../models/Appointment');
  const appointments = await Appointment.find({ doctor: req.params.id })
    .populate({
      path: 'patient',
      select: 'patientId userId',
      populate: { path: 'userId', select: 'name phone' }
    })
    .sort({ appointmentDate: -1 });

  res.status(200).json({ 
    success: true, 
    count: appointments.length,
    data: appointments 
  });
});
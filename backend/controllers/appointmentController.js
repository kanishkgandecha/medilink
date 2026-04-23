const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const asyncHandler = require('../utils/asyncHandler');

// Create new appointment
const createAppointment = asyncHandler(async (req, res) => {
  let { patient, doctor, appointmentDate, timeSlot, type, symptoms, priority } = req.body;

  // For Patient role: auto-resolve their own patient profile
  if (req.user.role === 'Patient') {
    const ownProfile = await Patient.findOne({ userId: req.user._id });
    if (!ownProfile) {
      return res.status(400).json({ success: false, message: 'Patient profile not found. Contact reception to set up your profile.' });
    }
    patient = ownProfile._id;
  }

  // Verify patient and doctor exist
  const patientExists = await Patient.findById(patient);
  const doctorExists = await Doctor.findById(doctor).populate('userId');

  if (!patientExists) {
    return res.status(404).json({ success: false, message: 'Patient not found' });
  }

  if (!doctorExists) {
    return res.status(404).json({ 
      success: false, 
      message: 'Doctor not found' 
    });
  }

  // Check if doctor is available
  if (!doctorExists.isAvailable) {
    return res.status(400).json({ 
      success: false, 
      message: 'Doctor is not available' 
    });
  }

  // Check if slot is available
  const existingAppointment = await Appointment.findOne({
    doctor,
    appointmentDate,
    'timeSlot.startTime': timeSlot.startTime,
    status: { $nin: ['Cancelled', 'Completed', 'No-Show'] }
  });

  if (existingAppointment) {
    return res.status(400).json({ 
      success: false, 
      message: 'Time slot is already booked' 
    });
  }

  const appointment = await Appointment.create({
    patient, 
    doctor, 
    appointmentDate, 
    timeSlot, 
    type, 
    symptoms, 
    priority,
    createdBy: req.user.id
  });

  const populatedAppointment = await Appointment.findById(appointment._id)
    .populate({ path: 'patient', populate: { path: 'userId' } })
    .populate({ path: 'doctor', populate: { path: 'userId' } });

  res.status(201).json({ 
    success: true, 
    data: populatedAppointment,
    message: 'Appointment created successfully'
  });
});

// Get all appointments with filters
const getAppointments = asyncHandler(async (req, res) => {
  const { doctor, patient, status, date, priority, search } = req.query;

  let query = {};

  // Patients only see their own appointments
  if (req.user.role === 'Patient') {
    const ownProfile = await Patient.findOne({ userId: req.user._id });
    if (!ownProfile) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    query.patient = ownProfile._id;
  } else if (req.user.role === 'Doctor') {
    // Doctors only see their own appointments
    const ownProfile = await Doctor.findOne({ userId: req.user._id });
    if (!ownProfile) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    query.doctor = ownProfile._id;
    if (patient) query.patient = patient;
  } else {
    if (doctor) query.doctor = doctor;
    if (patient) query.patient = patient;
  }

  if (status) query.status = status;
  if (priority) query.priority = priority;
  
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    query.appointmentDate = {
      $gte: startDate,
      $lt: endDate
    };
  }

  const appointments = await Appointment.find(query)
    .populate({
      path: 'patient',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .populate({
      path: 'doctor',
      populate: { path: 'userId', select: 'name email phone' }
    })
    .sort('-appointmentDate -timeSlot.startTime');

  // Search filter
  let filteredAppointments = appointments;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredAppointments = appointments.filter(apt => {
      const patientName = apt.patient?.userId?.name?.toLowerCase() || '';
      const doctorName = apt.doctor?.userId?.name?.toLowerCase() || '';
      const appointmentId = apt.appointmentId?.toLowerCase() || '';
      
      return patientName.includes(searchLower) || 
             doctorName.includes(searchLower) || 
             appointmentId.includes(searchLower);
    });
  }

  res.status(200).json({ 
    success: true, 
    count: filteredAppointments.length, 
    data: filteredAppointments 
  });
});

// Get single appointment
const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate({
      path: 'patient',
      populate: { path: 'userId' }
    })
    .populate({
      path: 'doctor',
      populate: { path: 'userId' }
    })
    .populate('prescription');
  
  if (!appointment) {
    return res.status(404).json({ 
      success: false, 
      message: 'Appointment not found' 
    });
  }

  res.status(200).json({ 
    success: true, 
    data: appointment 
  });
});

// Update appointment
const updateAppointment = asyncHandler(async (req, res) => {
  let appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found'
    });
  }

  const previousStatus = appointment.status;

  // If updating time slot, check availability
  if (req.body.timeSlot || req.body.appointmentDate) {
    const timeSlot = req.body.timeSlot || appointment.timeSlot;
    const appointmentDate = req.body.appointmentDate || appointment.appointmentDate;
    
    const conflict = await Appointment.findOne({
      doctor: appointment.doctor,
      appointmentDate,
      'timeSlot.startTime': timeSlot.startTime,
      _id: { $ne: req.params.id },
      status: { $nin: ['Cancelled', 'Completed', 'No-Show'] }
    });

    if (conflict) {
      return res.status(400).json({ 
        success: false, 
        message: 'Time slot not available' 
      });
    }
  }

  appointment = await Appointment.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  )
    .populate({
      path: 'patient',
      populate: { path: 'userId' }
    })
    .populate({
      path: 'doctor',
      populate: { path: 'userId' }
    });

  // Auto-generate bill when appointment is marked Completed
  if (req.body.status === 'Completed' && previousStatus !== 'Completed') {
    try {
      const appt = await Appointment.findById(req.params.id)
        .populate({ path: 'doctor', select: 'consultationFee' });

      const fee = appt?.doctor?.consultationFee || 500;
      const patientId = appt?.patient;

      if (patientId) {
        await Billing.create({
          patient: patientId,
          billType: 'Consultation',
          items: [{
            description: `Consultation - ${appointment.type || 'General'}`,
            category: 'Consultation',
            quantity: 1,
            unitPrice: fee,
            amount: fee
          }],
          subtotal: fee,
          discount: 0,
          tax: 0,
          totalAmount: fee,
          balance: fee,
          notes: `Auto-generated on appointment completion`,
          generatedBy: req.user.id
        });
      }
    } catch (billingErr) {
      // Don't fail the status update if billing creation fails
    }
  }

  res.status(200).json({
    success: true,
    data: appointment,
    message: 'Appointment updated successfully'
  });
});

// Cancel appointment
const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    return res.status(404).json({ 
      success: false, 
      message: 'Appointment not found' 
    });
  }

  if (appointment.status === 'Completed') {
    return res.status(400).json({ 
      success: false, 
      message: 'Cannot cancel completed appointment' 
    });
  }

  appointment.status = 'Cancelled';
  appointment.cancelReason = req.body.reason || 'No reason provided';
  await appointment.save();

  res.status(200).json({ 
    success: true, 
    data: appointment,
    message: 'Appointment cancelled successfully'
  });
});

// Reschedule appointment
const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { appointmentDate, timeSlot } = req.body;
  
  if (!appointmentDate || !timeSlot) {
    return res.status(400).json({ 
      success: false, 
      message: 'Date and time slot are required' 
    });
  }
  
  const appointment = await Appointment.findById(req.params.id);
  
  if (!appointment) {
    return res.status(404).json({ 
      success: false, 
      message: 'Appointment not found' 
    });
  }

  if (appointment.status === 'Completed' || appointment.status === 'Cancelled') {
    return res.status(400).json({ 
      success: false, 
      message: `Cannot reschedule ${appointment.status.toLowerCase()} appointment` 
    });
  }

  // Check availability for new slot
  const conflict = await Appointment.findOne({
    doctor: appointment.doctor,
    appointmentDate,
    'timeSlot.startTime': timeSlot.startTime,
    _id: { $ne: req.params.id },
    status: { $nin: ['Cancelled', 'Completed', 'No-Show'] }
  });

  if (conflict) {
    return res.status(400).json({ 
      success: false, 
      message: 'Time slot not available' 
    });
  }

  appointment.appointmentDate = appointmentDate;
  appointment.timeSlot = timeSlot;
  appointment.status = 'Scheduled';
  await appointment.save();

  const updatedAppointment = await Appointment.findById(appointment._id)
    .populate({
      path: 'patient',
      populate: { path: 'userId' }
    })
    .populate({
      path: 'doctor',
      populate: { path: 'userId' }
    });

  res.status(200).json({ 
    success: true, 
    data: updatedAppointment,
    message: 'Appointment rescheduled successfully'
  });
});

// Get doctor availability (available time slots)
const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;
  
  if (!date) {
    return res.status(400).json({ 
      success: false, 
      message: 'Date is required' 
    });
  }

  const doctor = await Doctor.findById(doctorId);
  
  if (!doctor) {
    return res.status(404).json({ 
      success: false, 
      message: 'Doctor not found' 
    });
  }

  // Get booked appointments for the date
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const bookedAppointments = await Appointment.find({
    doctor: doctorId,
    appointmentDate: { $gte: startDate, $lt: endDate },
    status: { $nin: ['Cancelled', 'No-Show'] }
  }).select('timeSlot');

  const bookedSlots = bookedAppointments.map(apt => apt.timeSlot.startTime);

  // Get doctor's schedule for the day
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  const daySchedule = doctor.availability.find(
    slot => slot.day.toLowerCase() === dayOfWeek.toLowerCase()
  );

  let availableSlots = [];
  if (daySchedule && daySchedule.slots.length > 0) {
    // Generate time slots based on doctor's schedule
    daySchedule.slots.forEach(slot => {
      if (slot.isAvailable) {
        const slots = generateTimeSlots(slot.startTime, slot.endTime);
        availableSlots = availableSlots.concat(
          slots.filter(time => !bookedSlots.includes(time))
        );
      }
    });
  }

  res.status(200).json({ 
    success: true, 
    data: {
      date,
      doctor: doctorId,
      availableSlots,
      bookedSlots
    }
  });
});

// Helper function to generate time slots
function generateTimeSlots(startTime, endTime, interval = 30) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    slots.push(
      `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
    );
    
    currentMin += interval;
    if (currentMin >= 60) {
      currentHour += 1;
      currentMin -= 60;
    }
  }
  
  return slots;
}

// Export all functions
module.exports = {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getDoctorAvailability
};
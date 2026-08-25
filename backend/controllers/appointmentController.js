const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../services/emailService');
const { formatAppointment } = require('../utils/virtuals');
const { normalizeAppointmentStatus, canTransitionAppointment } = require('../utils/stateMachines');
const { bookAppointmentTransaction, rescheduleAppointmentTransaction } = require('../services/appointmentBookingService');

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (slot) => (slot ? `${slot.startTime} – ${slot.endTime}` : '');

const formatPopulatedAppointment = (apt) => {
  if (!apt) return null;
  const formatted = formatAppointment(apt);
  delete formatted.bookingKey;
  return {
    ...formatted,
    _id: formatted.id,
    patient: formatted.patient
      ? {
          ...formatted.patient,
          _id: formatted.patient.id,
          userId: formatted.patient.user ? { ...formatted.patient.user, _id: formatted.patient.user.id } : null,
        }
      : null,
    doctor: formatted.doctor
      ? {
          ...formatted.doctor,
          _id: formatted.doctor.id,
          userId: formatted.doctor.user ? { ...formatted.doctor.user, _id: formatted.doctor.user.id } : null,
        }
      : null,
    prescription: formatted.prescription ? { ...formatted.prescription, _id: formatted.prescription.id } : null,
  };
};

const createAppointment = asyncHandler(async (req, res) => {
  let { patient, doctor, appointmentDate, timeSlot, type, symptoms, priority } = req.body;

  if (req.user.role === 'Patient') {
    const ownProfile = await prisma.patient.findFirst({ where: { userId: req.user.id } });
    if (!ownProfile) {
      return res.status(400).json({ success: false, message: 'Patient profile not found. Contact reception to set up your profile.' });
    }
    patient = ownProfile.id;
  }

  const startTime = timeSlot.startTime;
  const endTime = timeSlot.endTime;
  const bookingKey = String(req.body.bookingKey || req.get('Idempotency-Key') || '').trim() || null;
  const result = await bookAppointmentTransaction({ patientIdentifier: patient, doctorIdentifier: doctor,
    appointmentDate, startTime, endTime, type: type || 'Consultation', symptoms, priority,
    createdById: req.user.id, bookingKey });
  const errors = {
    patient_not_found: [404, 'Patient not found'], patient_inactive: [409, 'Patient account is archived or inactive'],
    doctor_not_found: [404, 'Doctor not found'], doctor_inactive: [409, 'Doctor is inactive or unavailable'],
    invalid_date: [400, 'Appointment date is invalid'], past_date: [400, 'Appointments cannot be booked in the past'],
    date_too_far: [400, 'Appointments cannot be booked more than one year ahead'],
    invalid_time_slot: [400, 'Appointments must use a valid 30-minute time slot'],
    schedule_not_configured: [409, 'Doctor schedule is not configured'],
    outside_doctor_schedule: [409, 'Selected time is outside the doctor’s configured schedule'],
    slot_conflict: [409, 'Time slot is already booked'],
  };
  if (result.error) {
    const [status, message] = errors[result.error] || [400, 'Appointment could not be booked'];
    return res.status(status).json({ success: false, message, code: result.error });
  }
  const appointment = result.appointment;

  const populatedAppointment = formatPopulatedAppointment(appointment);

  const patientEmail = populatedAppointment.patient?.userId?.email;
  const notifResult = result.replayed ? { success: false, mock: false } : await sendEmail(patientEmail, 'appointmentBooked', {
    patientName: populatedAppointment.patient?.userId?.name || 'Patient',
    doctorName: populatedAppointment.doctor?.userId?.name || 'Doctor',
    department: populatedAppointment.doctor?.department,
    date: fmtDate(appointment.appointmentDate),
    time: fmtTime({ startTime, endTime }),
    appointmentId: appointment.appointmentId,
    type: appointment.type,
  });

  res.status(result.replayed ? 200 : 201).json({
    success: true,
    data: populatedAppointment,
    message: result.replayed ? 'Appointment request already completed' : 'Appointment created successfully',
    replayed: result.replayed,
    notificationSent: notifResult.success,
    notificationMock: notifResult.mock || false,
  });
});

const getAppointments = asyncHandler(async (req, res) => {
  const { doctor, patient, status, date, priority, search } = req.query;

  const where = {};

  if (req.user.role === 'Patient') {
    const ownProfile = await prisma.patient.findFirst({ where: { userId: req.user.id } });
    if (!ownProfile) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    where.patientId = ownProfile.id;
  } else if (req.user.role === 'Doctor') {
    const ownProfile = await prisma.doctor.findFirst({ where: { userId: req.user.id } });
    if (!ownProfile) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
    where.doctorId = ownProfile.id;
    if (patient) {
      const p = await prisma.patient.findFirst({ where: { OR: [{ id: patient }, { legacyMongoId: patient }] } });
      if (p) where.patientId = p.id;
    }
  } else {
    if (doctor) {
      const d = await prisma.doctor.findFirst({ where: { OR: [{ id: doctor }, { legacyMongoId: doctor }] } });
      if (d) where.doctorId = d.id;
    }
    if (patient) {
      const p = await prisma.patient.findFirst({ where: { OR: [{ id: patient }, { legacyMongoId: patient }] } });
      if (p) where.patientId = p.id;
    }
  }

  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    where.appointmentDate = { gte: startDate, lt: endDate };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      doctor: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
    },
    orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
  });

  let formatted = appointments.map(formatPopulatedAppointment);

  if (search) {
    const searchLower = search.toLowerCase();
    formatted = formatted.filter((apt) => {
      const patientName = apt.patient?.userId?.name?.toLowerCase() || '';
      const doctorName = apt.doctor?.userId?.name?.toLowerCase() || '';
      const appointmentId = apt.appointmentId?.toLowerCase() || '';
      return patientName.includes(searchLower) || doctorName.includes(searchLower) || appointmentId.includes(searchLower);
    });
  }

  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted,
  });
});

const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      prescription: true,
    },
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  res.status(200).json({
    success: true,
    data: formatPopulatedAppointment(appointment),
  });
});

const updateAppointment = asyncHandler(async (req, res) => {
  let appointment = await prisma.appointment.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  const previousStatus = appointment.status;
  const requestedStatus = normalizeAppointmentStatus(req.body.status);

  if (requestedStatus && !canTransitionAppointment(previousStatus, requestedStatus)) {
    return res.status(409).json({
      success: false,
      message: `Appointment cannot transition from ${previousStatus} to ${requestedStatus}`,
    });
  }

  if (req.body.timeSlot || req.body.appointmentDate) {
    const startTime = req.body.timeSlot?.startTime || appointment.startTime;
    const appointmentDate = req.body.appointmentDate ? new Date(req.body.appointmentDate) : appointment.appointmentDate;

    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        appointmentDate,
        startTime,
        id: { not: appointment.id },
        status: { notIn: ['Cancelled', 'Completed', 'No_Show'] },
      },
    });

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'Time slot not available',
      });
    }
  }

  const updateData = {};
  if (requestedStatus) updateData.status = requestedStatus;
  if (req.body.priority) updateData.priority = req.body.priority;
  if (req.body.type) updateData.type = req.body.type;
  if (req.body.symptoms !== undefined) updateData.symptoms = req.body.symptoms;
  if (req.body.diagnosis !== undefined) updateData.diagnosis = req.body.diagnosis;
  if (req.body.notes !== undefined) updateData.notes = req.body.notes;
  if (req.body.cancelReason !== undefined) updateData.cancelReason = req.body.cancelReason;
  if (req.body.consultationFee !== undefined) updateData.consultationFee = parseFloat(req.body.consultationFee);
  if (req.body.paid !== undefined) updateData.paid = Boolean(req.body.paid);
  if (req.body.paymentMethod) updateData.paymentMethod = req.body.paymentMethod;
  if (req.body.appointmentDate) updateData.appointmentDate = new Date(req.body.appointmentDate);
  if (req.body.timeSlot) {
    updateData.startTime = req.body.timeSlot.startTime;
    updateData.endTime = req.body.timeSlot.endTime;
  }

  const updatedApt = await prisma.$transaction(async (tx) => {
    const updated = await tx.appointment.update({
      where: { id: appointment.id },
      data: updateData,
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        prescription: true,
      },
    });

    if (requestedStatus === 'Completed' && previousStatus !== 'Completed' && updated.patientId) {
      const fee = updated.doctor?.consultationFee || 500;
      const sourceKey = `appointment:${updated.id}:consultation`;
      await tx.billing.upsert({
        where: { sourceKey },
        update: {},
        create: {
          sourceKey,
          patientId: updated.patientId,
          billType: 'Consultation',
          subtotal: fee,
          discount: 0,
          tax: 0,
          totalAmount: fee,
          amountPaid: 0,
          balance: fee,
          paymentStatus: 'Unpaid',
          notes: 'Auto-generated on appointment completion',
          generatedById: req.user.id,
          relatedAppointmentId: updated.id,
          items: {
            create: [{
              description: `Consultation - ${updated.type || 'General'}`,
              category: 'Consultation',
              quantity: 1,
              unitPrice: fee,
              amount: fee,
            }],
          },
        },
      });
    }

    return updated;
  });

  const formattedPopulated = formatPopulatedAppointment(updatedApt);
  const newStatus = requestedStatus;
  const patEmail = updatedApt.patient?.user?.email;
  let notifResult = null;

  if (newStatus === 'Confirmed' && previousStatus !== 'Confirmed') {
    notifResult = await sendEmail(patEmail, 'appointmentConfirmed', {
      patientName: updatedApt.patient?.user?.name || 'Patient',
      doctorName: updatedApt.doctor?.user?.name || 'Doctor',
      date: fmtDate(updatedApt.appointmentDate),
      time: fmtTime({ startTime: updatedApt.startTime, endTime: updatedApt.endTime }),
      appointmentId: updatedApt.appointmentId,
    });
  } else if ((req.body.appointmentDate || req.body.timeSlot) && previousStatus !== 'Cancelled') {
    notifResult = await sendEmail(patEmail, 'appointmentRescheduled', {
      patientName: updatedApt.patient?.user?.name || 'Patient',
      doctorName: updatedApt.doctor?.user?.name || 'Doctor',
      newDate: fmtDate(updatedApt.appointmentDate),
      newTime: fmtTime({ startTime: updatedApt.startTime, endTime: updatedApt.endTime }),
      appointmentId: updatedApt.appointmentId,
    });
  }

  res.status(200).json({
    success: true,
    data: formattedPopulated,
    message: 'Appointment updated successfully',
    ...(notifResult && { notificationSent: notifResult.success, notificationMock: notifResult.mock || false }),
  });
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await prisma.appointment.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
    });
  }

  if (!canTransitionAppointment(appointment.status, 'Cancelled')) {
    return res.status(409).json({
      success: false,
      message: `Cannot cancel an appointment with status ${appointment.status}`,
    });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      status: 'Cancelled',
      cancelReason: req.body.reason || 'No reason provided',
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  res.status(200).json({
    success: true,
    data: formatPopulatedAppointment(updated),
    message: 'Appointment cancelled successfully',
  });
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { appointmentDate, timeSlot } = req.body;

  if (!appointmentDate || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: 'Date and time slot are required',
    });
  }

  const result = await rescheduleAppointmentTransaction({ appointmentIdentifier: req.params.id,
    appointmentDate, startTime: timeSlot.startTime, endTime: timeSlot.endTime });
  const errors = {
    appointment_not_found: [404, 'Appointment not found'], invalid_status: [409, 'Only scheduled or confirmed appointments can be rescheduled'],
    doctor_inactive: [409, 'Doctor is inactive or unavailable'], invalid_date: [400, 'Appointment date is invalid'],
    past_date: [400, 'Appointments cannot be moved into the past'], date_too_far: [400, 'Appointments cannot be moved more than one year ahead'],
    invalid_time_slot: [400, 'Appointments must use a valid 30-minute time slot'],
    schedule_not_configured: [409, 'Doctor schedule is not configured'],
    outside_doctor_schedule: [409, 'Selected time is outside the doctor’s configured schedule'], slot_conflict: [409, 'Time slot not available'],
  };
  if (result.error) {
    const [status, message] = errors[result.error] || [400, 'Appointment could not be rescheduled'];
    return res.status(status).json({ success: false, message, code: result.error });
  }
  const updated = result.appointment;

  res.status(200).json({
    success: true,
    data: formatPopulatedAppointment(updated),
    message: 'Appointment rescheduled successfully',
  });
});

const getDoctorAvailability = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      message: 'Date is required',
    });
  }

  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: doctorId }, { legacyMongoId: doctorId }] },
    include: { user: { select: { isActive: true } } },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }
  if (!doctor.isAvailable || !doctor.user?.isActive) {
    return res.status(409).json({ success: false, message: 'Doctor is inactive or unavailable' });
  }

  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      appointmentDate: { gte: startDate, lt: endDate },
      status: { in: ['Scheduled', 'Confirmed', 'In_Progress'] },
    },
    select: { startTime: true },
  });

  const bookedSlots = bookedAppointments.map((apt) => apt.startTime);

  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  const availabilityList = Array.isArray(doctor.availability) ? doctor.availability : [];
  const daySchedule = availabilityList.find(
    (slot) => slot.day && slot.day.toLowerCase() === dayOfWeek.toLowerCase()
  );

  let availableSlots = [];
  if (daySchedule && Array.isArray(daySchedule.slots) && daySchedule.slots.length > 0) {
    daySchedule.slots.forEach((slot) => {
      if (slot.isAvailable) {
        const slots = generateTimeSlots(slot.startTime, slot.endTime);
        availableSlots = availableSlots.concat(slots.filter((time) => !bookedSlots.includes(time)));
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      date,
      doctor: doctorId,
      availableSlots,
      bookedSlots,
    },
  });
});

function generateTimeSlots(startTime, endTime, interval = 30) {
  const slots = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  let currentHour = startHour;
  let currentMin = startMin;

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`);
    currentMin += interval;
    if (currentMin >= 60) {
      currentHour += 1;
      currentMin -= 60;
    }
  }

  return slots;
}

module.exports = {
  createAppointment,
  getAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getDoctorAvailability,
};

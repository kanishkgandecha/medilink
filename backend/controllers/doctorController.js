const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination } = require('../utils/pagination');
const { hashPassword } = require('../utils/userHelpers');
const { formatAppointment } = require('../utils/virtuals');
const { runSerializableTransaction } = require('../utils/transactions');
const crypto = require('crypto');

// Get users with role "Doctor" who don't have a doctor profile yet
exports.getAvailableDoctorUsers = asyncHandler(async (req, res) => {
  const doctorUsers = await prisma.user.findMany({
    where: { role: 'Doctor', isActive: true },
    select: { id: true, name: true, email: true, phone: true, legacyMongoId: true },
  });

  const existingDoctors = await prisma.doctor.findMany({
    select: { userId: true },
  });
  const existingUserIds = new Set(existingDoctors.map((d) => d.userId));

  const availableUsers = doctorUsers
    .filter((user) => !existingUserIds.has(user.id))
    .map((u) => ({ ...u, _id: u.id }));

  res.status(200).json({
    success: true,
    count: availableUsers.length,
    data: availableUsers,
  });
});

exports.createDoctor = asyncHandler(async (req, res) => {
  const {
    userId,
    name,
    email,
    phone,
    gender,
    dateOfBirth,
    specialization,
    qualification,
    experience,
    licenseNumber,
    department,
    consultationFee,
    availability,
  } = req.body;

  if (!userId && (!name || !email || !phone)) {
    return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
  }
  const hashedPassword = userId ? null : await hashPassword(phone);
  const finalLicense = licenseNumber || `LIC-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const doctor = await runSerializableTransaction(async (tx) => {
    let targetUser;
    if (userId) {
      targetUser = await tx.user.findFirst({ where: { OR: [{ id: userId }, { legacyMongoId: userId }] } });
      if (!targetUser || targetUser.role !== 'Doctor' || !targetUser.isActive) {
        const error = new Error('Invalid or inactive user, or user does not have the Doctor role');
        error.statusCode = 400;
        throw error;
      }
    } else {
      const normalizedEmail = email.toLowerCase();
      const duplicate = await tx.user.findFirst({ where: { OR: [{ email: normalizedEmail }, { phone }] } });
      if (duplicate) {
        const error = new Error(`${duplicate.email === normalizedEmail ? 'Email' : 'Phone'} already registered`);
        error.statusCode = 409;
        throw error;
      }
      targetUser = await tx.user.create({ data: { name, email: normalizedEmail, password: hashedPassword,
        role: 'Doctor', phone, gender: gender || null, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null } });
    }
    if (await tx.doctor.findUnique({ where: { userId: targetUser.id } })) {
      const error = new Error('Doctor profile already exists for this user');
      error.statusCode = 409;
      throw error;
    }
    return tx.doctor.create({ data: {
      userId: targetUser.id,
      specialization: specialization || 'General',
      qualification: qualification || 'MBBS',
      experience: parseInt(experience) || 0,
      licenseNumber: finalLicense,
      department: department || specialization || 'General',
      consultationFee: parseFloat(consultationFee) || 0,
      availability: availability || [],
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, gender: true, dateOfBirth: true },
      },
    } });
  });

  const formattedDoctor = {
    ...doctor,
    _id: doctor.id,
    userId: {
      ...doctor.user,
      _id: doctor.user.id,
    },
  };

  res.status(201).json({
    success: true,
    message: 'Doctor created successfully. Default password is the phone number.',
    data: formattedDoctor,
  });
});

exports.getDoctors = asyncHandler(async (req, res) => {
  const { specialization, department, isAvailable, search } = req.query;

  const where = { user: { isActive: true } };
  if (specialization) where.specialization = specialization;
  if (department) where.department = department;
  if (isAvailable !== undefined) where.isAvailable = isAvailable === 'true';

  if (search) {
    where.OR = [
      { licenseNumber: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const { page, limit: take, skip } = getPagination(req.query);

  const doctors = await prisma.doctor.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          dateOfBirth: true,
          gender: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  const total = await prisma.doctor.count({ where });

  const formattedDoctors = doctors.map((d) => ({
    ...d,
    _id: d.id,
    userId: d.user
      ? {
          ...d.user,
          _id: d.user.id,
          address: {
            street: d.user.street,
            city: d.user.city,
            state: d.user.state,
            zipCode: d.user.zipCode,
            country: d.user.country,
          },
        }
      : null,
  }));

  res.status(200).json({
    success: true,
    count: formattedDoctors.length,
    total,
    page,
    pages: Math.ceil(total / take),
    data: formattedDoctors,
  });
});

exports.getDoctor = asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          dateOfBirth: true,
          gender: true,
        },
      },
    },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  const formattedDoctor = {
    ...doctor,
    _id: doctor.id,
    userId: doctor.user
      ? {
          ...doctor.user,
          _id: doctor.user.id,
          address: {
            street: doctor.user.street,
            city: doctor.user.city,
            state: doctor.user.state,
            zipCode: doctor.user.zipCode,
            country: doctor.user.country,
          },
        }
      : null,
  };

  res.status(200).json({
    success: true,
    data: formattedDoctor,
  });
});

exports.updateDoctor = asyncHandler(async (req, res) => {
  let doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  delete req.body.userId;

  const data = {};
  if (req.body.specialization) data.specialization = req.body.specialization;
  if (req.body.qualification) data.qualification = req.body.qualification;
  if (req.body.experience !== undefined) data.experience = parseInt(req.body.experience);
  if (req.body.licenseNumber) data.licenseNumber = req.body.licenseNumber;
  if (req.body.department) data.department = req.body.department;
  if (req.body.consultationFee !== undefined) data.consultationFee = parseFloat(req.body.consultationFee);
  if (req.body.availability !== undefined) data.availability = req.body.availability;
  if (req.body.isAvailable !== undefined) data.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';

  const updatedDoctor = await prisma.doctor.update({
    where: { id: doctor.id },
    data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          dateOfBirth: true,
          gender: true,
        },
      },
    },
  });

  const formattedDoctor = {
    ...updatedDoctor,
    _id: updatedDoctor.id,
    userId: updatedDoctor.user
      ? {
          ...updatedDoctor.user,
          _id: updatedDoctor.user.id,
          address: {
            street: updatedDoctor.user.street,
            city: updatedDoctor.user.city,
            state: updatedDoctor.user.state,
            zipCode: updatedDoctor.user.zipCode,
            country: updatedDoctor.user.country,
          },
        }
      : null,
  };

  res.status(200).json({
    success: true,
    message: 'Doctor updated successfully',
    data: formattedDoctor,
  });
});

exports.deleteDoctor = asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  const upcomingAppointment = await prisma.appointment.findFirst({
    where: { doctorId: doctor.id, appointmentDate: { gte: new Date() }, status: { in: ['Scheduled', 'Confirmed', 'In_Progress'] } },
    select: { id: true, appointmentDate: true },
  });
  if (upcomingAppointment) {
    return res.status(409).json({
      success: false,
      message: 'Doctor has upcoming active appointments. Reassign or cancel them before deactivation.',
    });
  }

  await runSerializableTransaction(async (tx) => {
    await tx.doctor.update({ where: { id: doctor.id }, data: { isAvailable: false, availability: [] } });
    await tx.user.update({ where: { id: doctor.userId }, data: { isActive: false } });
  });

  res.status(200).json({
    success: true,
    message: 'Doctor deactivated successfully; historical records were retained',
  });
});

exports.updateAvailability = asyncHandler(async (req, res) => {
  const targetDoctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!targetDoctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  const doctor = await prisma.doctor.update({
    where: { id: targetDoctor.id },
    data: { availability: req.body.availability },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  const formatted = {
    ...doctor,
    _id: doctor.id,
    userId: doctor.user ? { ...doctor.user, _id: doctor.user.id } : null,
  };

  res.status(200).json({
    success: true,
    message: 'Availability updated successfully',
    data: formatted,
  });
});

exports.addOnCallShift = asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  const existingShifts = Array.isArray(doctor.onCallShifts) ? doctor.onCallShifts : [];
  existingShifts.push(req.body);

  const updated = await prisma.doctor.update({
    where: { id: doctor.id },
    data: { onCallShifts: existingShifts },
  });

  res.status(200).json({
    success: true,
    message: 'On-call shift added successfully',
    data: { ...updated, _id: updated.id },
  });
});

exports.getDoctorSchedule = asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    select: {
      id: true,
      availability: true,
      onCallShifts: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...doctor,
      _id: doctor.id,
      userId: doctor.user ? { ...doctor.user, _id: doctor.user.id } : null,
    },
  });
});

exports.getDoctorAppointments = asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!doctor) {
    return res.status(404).json({
      success: false,
      message: 'Doctor not found',
    });
  }

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: doctor.id },
    include: {
      patient: {
        select: {
          id: true,
          patientId: true,
          user: { select: { id: true, name: true, phone: true } },
        },
      },
    },
    orderBy: { appointmentDate: 'desc' },
  });

  const formatted = appointments.map((a) => {
    const fmt = formatAppointment(a);
    return {
      ...fmt,
      _id: fmt.id,
      patient: fmt.patient
        ? {
            ...fmt.patient,
            _id: fmt.patient.id,
            userId: fmt.patient.user ? { ...fmt.patient.user, _id: fmt.patient.user.id } : null,
          }
        : null,
    };
  });

  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted,
  });
});

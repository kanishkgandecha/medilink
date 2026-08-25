const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword } = require('../utils/userHelpers');
const { runSerializableTransaction } = require('../utils/transactions');
const crypto = require('crypto');

const SUB_ROLE_MAP = {
  Nurse: 'Nurse', Receptionist: 'Receptionist', Pharmacist: 'Pharmacist',
  'Lab Technician': 'LabTechnician', LabTechnician: 'LabTechnician',
  'Ward Manager': 'WardManager', WardManager: 'WardManager',
};
const normalizeEmploymentType = (value) => ({ 'Full-Time': 'Full_Time', 'Part-Time': 'Part_Time' }[value] || value || 'Full_Time');

const formatPopulatedStaff = (s) => {
  if (!s) return null;
  return {
    ...s,
    _id: s.id,
    userId: s.user
      ? {
          ...s.user,
          _id: s.user.id,
          address: {
            street: s.user.street,
            city: s.user.city,
            state: s.user.state,
            zipCode: s.user.zipCode,
            country: s.user.country,
          },
        }
      : null,
    supervisor: s.supervisor ? { ...s.supervisor, _id: s.supervisor.id } : null,
  };
};

exports.createStaff = asyncHandler(async (req, res) => {
  const {
    userId,
    name,
    email,
    phone,
    gender,
    subRole,
    designation,
    department,
    qualification,
    joiningDate,
    employmentType,
    shift,
    salary,
  } = req.body;

  if (!userId && (!name || !email || !phone)) {
    return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
  }
  const finalSubRole = SUB_ROLE_MAP[subRole || designation];
  if (!finalSubRole) {
    return res.status(400).json({ success: false, message: 'A valid staff sub-role is required' });
  }
  const hashedPassword = userId ? null : await hashPassword(phone);
  const employeeId = `EMP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const finalDesignation = designation || subRole || 'Staff';
  const basic = parseFloat(salary?.basic) || 0;
  const allowances = parseFloat(salary?.allowances) || 0;
  const staff = await runSerializableTransaction(async (tx) => {
    let targetUser;
    if (userId) {
      targetUser = await tx.user.findFirst({ where: { OR: [{ id: userId }, { legacyMongoId: userId }] } });
      if (!targetUser || !targetUser.isActive || targetUser.role !== 'Staff') {
        const error = new Error('Invalid or inactive staff user');
        error.statusCode = 400;
        throw error;
      }
      if (targetUser.subRole !== finalSubRole) {
        targetUser = await tx.user.update({ where: { id: targetUser.id }, data: { subRole: finalSubRole } });
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
        role: 'Staff', subRole: finalSubRole, phone, gender: gender || null } });
    }
    if (await tx.staff.findUnique({ where: { userId: targetUser.id } })) {
      const error = new Error('Staff profile already exists for this user');
      error.statusCode = 409;
      throw error;
    }
    return tx.staff.create({ data: {
      userId: targetUser.id,
      employeeId,
      designation: finalDesignation,
      department: department || 'Administration',
      qualification: qualification || null,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      employmentType: normalizeEmploymentType(employmentType),
      shift: shift || 'Morning',
      salary: { basic, allowances, total: basic + allowances },
    },
    include: { user: true } });
  });

  res.status(201).json({
    success: true,
    message: 'Staff member created successfully. Default password is the phone number.',
    data: formatPopulatedStaff(staff),
  });
});

exports.getStaff = asyncHandler(async (req, res) => {
  const { department, designation, employmentType, shift } = req.query;

  const where = { isActive: true, user: { isActive: true } };
  if (department) where.department = department;
  if (designation) where.designation = designation;
  if (employmentType) where.employmentType = employmentType;
  if (shift) where.shift = shift;

  const staff = await prisma.staff.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, role: true, dateOfBirth: true, gender: true } },
      supervisor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = staff.map(formatPopulatedStaff);
  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

exports.getAvailableStaffUsers = asyncHandler(async (req, res) => {
  const existingStaff = await prisma.staff.findMany({ where: { isActive: true }, select: { userId: true } });
  const existingUserIds = new Set(existingStaff.map((s) => s.userId));

  const availableUsers = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(existingUserIds) },
      isActive: true,
      role: { notIn: ['Admin', 'Doctor', 'Patient'] },
    },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  const formatted = availableUsers.map((u) => ({ ...u, _id: u.id }));
  res.status(200).json({ success: true, data: formatted });
});

exports.getStaffMember = asyncHandler(async (req, res) => {
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, role: true, dateOfBirth: true, gender: true, street: true, city: true, state: true, zipCode: true, country: true } },
      supervisor: { select: { id: true, name: true, email: true } },
    },
  });

  if (!staff) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  res.status(200).json({ success: true, data: formatPopulatedStaff(staff) });
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!staff) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  const { designation, department, qualification, joiningDate, employmentType, shift, salary, skills, supervisor } = req.body;

  const data = {};
  if (designation) data.designation = designation;
  if (department) data.department = department;
  if (qualification !== undefined) data.qualification = qualification;
  if (joiningDate) data.joiningDate = new Date(joiningDate);
  if (employmentType) data.employmentType = normalizeEmploymentType(employmentType);
  if (shift) data.shift = shift;
  if (skills) data.skills = skills;

  if (supervisor) {
    const supUser = await prisma.user.findFirst({ where: { OR: [{ id: supervisor }, { legacyMongoId: supervisor }] } });
    if (supUser) data.supervisorId = supUser.id;
  }

  if (salary) {
    const existingSalary = typeof staff.salary === 'object' && staff.salary ? staff.salary : {};
    const basic = salary.basic !== undefined ? parseFloat(salary.basic) : parseFloat(existingSalary.basic || 0);
    const allowances = salary.allowances !== undefined ? parseFloat(salary.allowances) : parseFloat(existingSalary.allowances || 0);
    data.salary = { basic, allowances, total: basic + allowances };
  }

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      supervisor: { select: { id: true, name: true } },
    },
  });

  res.status(200).json({ success: true, data: formatPopulatedStaff(updated) });
});

exports.deleteStaff = asyncHandler(async (req, res) => {
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!staff) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  await runSerializableTransaction(async (tx) => {
    await tx.staff.update({ where: { id: staff.id }, data: { isActive: false } });
    await tx.user.update({ where: { id: staff.userId }, data: { isActive: false } });
  });

  res.status(200).json({ success: true, message: 'Staff member deactivated successfully' });
});

exports.updatePerformance = asyncHandler(async (req, res) => {
  const { rating, notes } = req.body;

  const staff = await prisma.staff.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!staff) {
    return res.status(404).json({ message: 'Staff member not found' });
  }

  const updated = await prisma.staff.update({
    where: { id: staff.id },
    data: {
      performance: {
        rating: Number(rating),
        lastReviewDate: new Date().toISOString(),
        notes,
      },
    },
    include: { user: true },
  });

  res.status(200).json({ success: true, data: formatPopulatedStaff(updated) });
});

exports.getStaffByDepartment = asyncHandler(async (req, res) => {
  const { department } = req.params;

  const staff = await prisma.staff.findMany({
    where: { department, isActive: true, user: { isActive: true } },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = staff.map(formatPopulatedStaff);
  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

exports.getStaffStats = asyncHandler(async (req, res) => {
  const staffList = await prisma.staff.findMany({ where: { isActive: true, user: { isActive: true } } });
  const totalStaff = staffList.length;

  const depMap = {};
  const shiftMap = {};
  const empMap = {};

  staffList.forEach((s) => {
    depMap[s.department] = (depMap[s.department] || 0) + 1;
    shiftMap[s.shift] = (shiftMap[s.shift] || 0) + 1;
    empMap[s.employmentType] = (empMap[s.employmentType] || 0) + 1;
  });

  res.status(200).json({
    success: true,
    data: {
      totalStaff,
      byDepartment: Object.entries(depMap).map(([_id, count]) => ({ _id, count })),
      byShift: Object.entries(shiftMap).map(([_id, count]) => ({ _id, count })),
      byEmploymentType: Object.entries(empMap).map(([_id, count]) => ({ _id, count })),
    },
  });
});

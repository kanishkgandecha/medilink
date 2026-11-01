const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword } = require('../utils/userHelpers');
const { formatAppointment } = require('../utils/virtuals');
const { getPagination } = require('../utils/pagination');
const { runSerializableTransaction } = require('../utils/transactions');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { REPORT_ATTACHMENT_DIR } = require('../middleware/upload');
const { SAFE_USER_SELECT } = require('../utils/safeUser');
const { isDoctorUser, getDoctorProfileId, doctorCareWhere } = require('../utils/careScope');
const { patientListSelectForUser, canViewClinicalDetail } = require('../utils/patientProjection');
const { normalizeBloodGroup } = require('../utils/bloodGroup');
const toAuditJson = (value) => JSON.parse(JSON.stringify(value));

const generatePatientId = () => `PAT${Date.now().toString().slice(-6)}${crypto.randomInt(100000, 1000000)}`;

const formatPatientResponse = (patient) => {
  if (!patient) return null;
  return {
    ...patient,
    _id: patient.id,
    userId: patient.user
      ? {
          ...patient.user,
          _id: patient.user.id,
          address: {
            street: patient.user.street,
            city: patient.user.city,
            state: patient.user.state,
            zipCode: patient.user.zipCode,
            country: patient.user.country,
          },
        }
      : null,
  };
};

exports.getAvailablePatientUsers = asyncHandler(async (req, res) => {
  const patientUsers = await prisma.user.findMany({
    where: { role: 'Patient', isActive: true },
    select: { id: true, name: true, email: true, phone: true, dateOfBirth: true, gender: true },
  });

  const existingPatients = await prisma.patient.findMany({ select: { userId: true } });
  const existingUserIds = new Set(existingPatients.map((p) => p.userId));

  const availableUsers = patientUsers
    .filter((user) => !existingUserIds.has(user.id))
    .map((u) => ({ ...u, _id: u.id }));

  res.status(200).json({
    success: true,
    count: availableUsers.length,
    data: availableUsers,
  });
});

const RADIOLOGY_TYPES = ['x-ray', 'xray', 'ct scan', 'mri scan', 'ultrasound', 'echocardiogram'];
const isRadiologyReport = (report) => RADIOLOGY_TYPES.includes(String(report.testType || '').toLowerCase());
const isRadiologyUser = (user) => String(user?.subRole || '').replace(/[^a-z]/gi, '').toLowerCase() === 'radiologytechnician';

const reportsForDiagnosticRole = (reports, user) => (reports || []).filter((report) =>
  isRadiologyUser(user) ? isRadiologyReport(report) : !isRadiologyReport(report)
);

exports.getDiagnosticWorkspace = asyncHandler(async (req, res) => {
  const patients = await prisma.patient.findMany({
    where: { archivedAt: null, user: { isActive: true } },
    select: {
      id: true,
      patientId: true,
      user: { select: { name: true } },
      labReports: { orderBy: { addedAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const patientIndex = patients.map((patient) => {
    const reports = reportsForDiagnosticRole(patient.labReports, req.user);
    return {
      _id: patient.id,
      patientId: patient.patientId,
      userId: { name: patient.user?.name || 'Unknown patient' },
      reportCount: reports.length,
      latestReportAt: reports[0]?.addedAt || null,
    };
  });

  const reports = patients.flatMap((patient) =>
    reportsForDiagnosticRole(patient.labReports, req.user).map((report) => ({
      ...report,
      _id: report.id,
      patient: { _id: patient.id, patientId: patient.patientId, name: patient.user?.name || 'Unknown patient' },
    }))
  ).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));

  const statusCount = (status) => reports.filter((report) => report.status === status).length;
  res.json({
    success: true,
    data: {
      patients: patientIndex,
      recentReports: reports.slice(0, 12),
      overview: {
        totalReports: reports.length,
        pending: statusCount('Pending') + statusCount('Collected'),
        processing: statusCount('Processing'),
        completed: statusCount('Completed') + statusCount('Verified') + statusCount('Normal') + statusCount('Abnormal') + statusCount('Borderline'),
      },
    },
  });
});

exports.getDiagnosticRecords = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }], archivedAt: null },
    select: {
      id: true,
      patientId: true,
      user: { select: { name: true } },
      labReports: { orderBy: { addedAt: 'desc' } },
    },
  });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  res.json({
    success: true,
    data: {
      patient: { _id: patient.id, patientId: patient.patientId, name: patient.user?.name || 'Unknown patient' },
      labReports: reportsForDiagnosticRole(patient.labReports, req.user).map((report) => ({ ...report, _id: report.id })),
    },
  });
});

exports.createPatient = asyncHandler(async (req, res) => {
  const {
    userId,
    name,
    email,
    phone,
    gender,
    dateOfBirth,
    bloodGroup,
    emergencyContact,
    allergies,
    insuranceInfo,
  } = req.body;

  if (!userId && (!name || !email || !phone)) {
    return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
  }

  const hashedPassword = userId ? null : await hashPassword(phone);
  const patient = await runSerializableTransaction(async (tx) => {
    let targetUser;
    if (userId) {
      targetUser = await tx.user.findFirst({ where: { OR: [{ id: userId }, { legacyMongoId: userId }] } });
      if (!targetUser || targetUser.role !== 'Patient' || !targetUser.isActive) {
        const error = new Error('Invalid or inactive user, or user does not have the Patient role');
        error.statusCode = 400;
        throw error;
      }
    } else {
      const normalizedEmail = email.toLowerCase();
      const duplicate = await tx.user.findFirst({ where: { OR: [{ email: normalizedEmail }, { phone }] } });
      if (duplicate) {
        const error = new Error(`${duplicate.email === normalizedEmail ? 'Email' : 'Phone number'} already registered`);
        error.statusCode = 409;
        throw error;
      }
      targetUser = await tx.user.create({
        data: { name, email: normalizedEmail, password: hashedPassword, role: 'Patient', phone,
          gender: gender || null, dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null },
      });
    }

    if (await tx.patient.findUnique({ where: { userId: targetUser.id } })) {
      const error = new Error('Patient profile already exists for this user');
      error.statusCode = 409;
      throw error;
    }

    return tx.patient.create({
      data: { userId: targetUser.id, patientId: generatePatientId(), bloodGroup: normalizeBloodGroup(bloodGroup) || null,
        emergencyContact: emergencyContact || null, allergies: allergies || [], insuranceInfo: insuranceInfo || null },
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
      medicalHistory: { where: { isVoided: false } },
      currentMedications: true,
      labReports: true,
      imagingData: true,
      admissionHistory: true,
      },
    });
  });

  res.status(201).json({
    success: true,
    message: userId
      ? 'Patient profile created successfully'
      : 'Patient created successfully. The default password is the phone number and can be changed optionally.',
    data: formatPatientResponse(patient),
  });
});

exports.getPatients = asyncHandler(async (req, res) => {
  if (req.user.role === 'Patient') {
    const patient = await prisma.patient.findFirst({
      where: { userId: req.user.id },
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
        medicalHistory: { where: { isVoided: false } },
        currentMedications: true,
        labReports: true,
        imagingData: true,
        admissionHistory: true,
      },
    });
    const formatted = formatPatientResponse(patient);
    return res.status(200).json({
      success: true,
      count: formatted ? 1 : 0,
      data: formatted ? [formatted] : [],
    });
  }

  const { search, bloodGroup } = req.query;

  const where = { archivedAt: null, user: { isActive: true } };
  if (bloodGroup) where.bloodGroup = normalizeBloodGroup(bloodGroup);

  // Doctors see only patients they are in a care relationship with.
  if (isDoctorUser(req.user)) {
    const doctorId = await getDoctorProfileId(req.user.id);
    if (!doctorId) return res.status(200).json({ success: true, count: 0, total: 0, page: 1, pages: 0, data: [] });
    where.AND = [doctorCareWhere(doctorId)];
  }

  if (search) {
    where.OR = [
      { patientId: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const { page, limit: take, skip } = getPagination(req.query);

  // Minimum-necessary projection per role; clinical sub-records are served
  // only by the care-scoped record endpoints, never by the list.
  const patients = await prisma.patient.findMany({
    where,
    select: patientListSelectForUser(req.user),
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  const total = await prisma.patient.count({ where });

  const formattedPatients = patients.map(formatPatientResponse);

  res.status(200).json({
    success: true,
    count: formattedPatients.length,
    total,
    page,
    pages: Math.ceil(total / take),
    data: formattedPatients,
  });
});

exports.getPatient = asyncHandler(async (req, res) => {
  const where = { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] };
  if (!canViewClinicalDetail(req.user)) {
    // Receptionist / Pharmacist / Ward Manager get their role's summary only.
    const summary = await prisma.patient.findFirst({ where, select: patientListSelectForUser(req.user) });
    if (!summary) return res.status(404).json({ success: false, message: 'Patient not found' });
    return res.status(200).json({ success: true, data: formatPatientResponse(summary) });
  }
  const patient = await prisma.patient.findFirst({
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
      medicalHistory: { where: { isVoided: false } },
      currentMedications: true,
      labReports: true,
      imagingData: true,
      admissionHistory: true,
    },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  res.status(200).json({
    success: true,
    data: formatPatientResponse(patient),
  });
});

exports.getPatientMedicalRecords = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, dateOfBirth: true, gender: true } },
      medicalHistory: { where: { isVoided: false } },
      labReports: true,
      currentMedications: true,
    },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  res.status(200).json({
    success: true,
    data: formatPatientResponse(patient),
  });
});

exports.getPatientAppointments = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: {
        select: {
          id: true,
          specialization: true,
          user: { select: { id: true, name: true } },
        },
      },
      patient: { select: { id: true, patientId: true } },
    },
    orderBy: { appointmentDate: 'desc' },
  });

  const formatted = appointments.map((a) => {
    const fmt = formatAppointment(a);
    return {
      ...fmt,
      _id: fmt.id,
      doctor: fmt.doctor
        ? {
            ...fmt.doctor,
            _id: fmt.doctor.id,
            userId: fmt.doctor.user ? { ...fmt.doctor.user, _id: fmt.doctor.user.id } : null,
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

exports.updatePatient = asyncHandler(async (req, res) => {
  let patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  delete req.body.userId;
  delete req.body.patientId;

  if (req.user.role === 'Patient') {
    const clinicalFields = ['bloodGroup', 'allergies'].filter((field) => req.body[field] !== undefined);
    if (clinicalFields.length) {
      return res.status(403).json({
        success: false,
        message: 'Clinical details such as blood group and allergies can only be updated by clinical staff',
      });
    }
  }

  const data = {};
  if (req.body.bloodGroup) data.bloodGroup = normalizeBloodGroup(req.body.bloodGroup);
  if (req.body.emergencyContact) data.emergencyContact = req.body.emergencyContact;
  if (req.body.allergies) data.allergies = req.body.allergies;
  if (req.body.insuranceInfo) data.insuranceInfo = req.body.insuranceInfo;

  const updatedPatient = await prisma.patient.update({
    where: { id: patient.id },
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
      medicalHistory: { where: { isVoided: false } },
      currentMedications: true,
      labReports: true,
      imagingData: true,
      admissionHistory: true,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Patient updated successfully',
    data: formatPatientResponse(updatedPatient),
  });
});

exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  if (patient.archivedAt) {
    return res.status(200).json({ success: true, message: 'Patient is already archived' });
  }

  const occupiedBed = await prisma.bed.findFirst({ where: { patientId: patient.id, isOccupied: true } });
  if (occupiedBed) {
    return res.status(409).json({ success: false, message: 'Discharge the patient from their occupied bed before archiving' });
  }

  const reason = String(req.body?.reason || 'Archived by an administrator').trim().slice(0, 500);
  await runSerializableTransaction(async (tx) => {
    await tx.patient.update({ where: { id: patient.id }, data: { archivedAt: new Date(), archiveReason: reason } });
    await tx.user.update({ where: { id: patient.userId }, data: { isActive: false } });
    await tx.clinicalAuditEvent.create({
      data: { patientId: patient.id, actorId: req.user.id, recordType: 'Patient', recordId: patient.id,
        action: 'ARCHIVED', reason },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Patient archived successfully; clinical records were retained',
  });
});

exports.addMedicalHistory = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const { condition, diagnosedDate, status, notes } = req.body;
  if (!condition || !diagnosedDate || !status) {
    return res.status(400).json({
      success: false,
      message: 'Condition, diagnosed date, and status are required',
    });
  }

  await runSerializableTransaction(async (tx) => {
    const history = await tx.medicalHistory.create({ data: {
      patientId: patient.id,
      condition,
      diagnosedDate: new Date(diagnosedDate),
      status,
      notes: notes || null,
    } });
    await tx.clinicalAuditEvent.create({ data: { patientId: patient.id, actorId: req.user.id,
      recordType: 'MedicalHistory', recordId: history.id, action: 'CREATED', after: toAuditJson(history) } });
  });

  const updatedPatient = await prisma.patient.findUnique({
    where: { id: patient.id },
    include: { medicalHistory: { where: { isVoided: false } }, user: { select: SAFE_USER_SELECT } },
  });

  res.status(200).json({
    success: true,
    message: 'Medical history added successfully',
    data: formatPatientResponse(updatedPatient),
  });
});

exports.updateMedicalHistory = asyncHandler(async (req, res) => {
  const { id, historyId } = req.params;

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id }, { legacyMongoId: id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const historyItem = await prisma.medicalHistory.findFirst({
    where: { id: historyId, patientId: patient.id, isVoided: false },
  });

  if (!historyItem) {
    return res.status(404).json({
      success: false,
      message: 'Medical history item not found',
    });
  }

  const data = {};
  if (req.body.condition) data.condition = req.body.condition;
  if (req.body.diagnosedDate) data.diagnosedDate = new Date(req.body.diagnosedDate);
  if (req.body.status) data.status = req.body.status;
  if (req.body.notes !== undefined) data.notes = req.body.notes;

  await runSerializableTransaction(async (tx) => {
    const updated = await tx.medicalHistory.update({ where: { id: historyId }, data });
    await tx.clinicalAuditEvent.create({ data: { patientId: patient.id, actorId: req.user.id,
      recordType: 'MedicalHistory', recordId: historyId, action: 'AMENDED', before: toAuditJson(historyItem), after: toAuditJson(updated),
      reason: String(req.body.reason || 'Clinical record correction').slice(0, 500) } });
  });

  const updatedPatient = await prisma.patient.findUnique({
    where: { id: patient.id },
    include: { medicalHistory: { where: { isVoided: false } }, user: { select: SAFE_USER_SELECT } },
  });

  res.status(200).json({
    success: true,
    message: 'Medical history updated successfully',
    data: formatPatientResponse(updatedPatient),
  });
});

exports.deleteMedicalHistory = asyncHandler(async (req, res) => {
  const { id, historyId } = req.params;

  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id }, { legacyMongoId: id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const historyItem = await prisma.medicalHistory.findFirst({
    where: { id: historyId, patientId: patient.id, isVoided: false },
  });
  if (!historyItem) {
    return res.status(404).json({ success: false, message: 'Medical history item not found' });
  }

  const reason = String(req.body?.reason || '').trim();
  if (reason.length < 3) {
    return res.status(400).json({ success: false, message: 'A reason is required to void a clinical record' });
  }
  await runSerializableTransaction(async (tx) => {
    const voided = await tx.medicalHistory.update({ where: { id: historyId },
      data: { isVoided: true, voidedAt: new Date(), voidReason: reason.slice(0, 500) } });
    await tx.clinicalAuditEvent.create({ data: { patientId: patient.id, actorId: req.user.id,
      recordType: 'MedicalHistory', recordId: historyId, action: 'VOIDED', before: toAuditJson(historyItem),
      after: toAuditJson(voided), reason: reason.slice(0, 500) } });
  });

  const updatedPatient = await prisma.patient.findUnique({
    where: { id: patient.id },
    include: { medicalHistory: { where: { isVoided: false } }, user: { select: SAFE_USER_SELECT } },
  });

  res.status(200).json({
    success: true,
    message: 'Medical history entry voided; its audit trail was retained',
    data: formatPatientResponse(updatedPatient),
  });
});

exports.addLabReport = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const { testName } = req.body;
  if (!testName) {
    return res.status(400).json({
      success: false,
      message: 'Test name is required',
    });
  }

  // Diagnostic staff may only create reports within their own modality.
  if (isDiagnosticRole(req.user) && isRadiologyUser(req.user) !== isRadiologyReport({ testType: req.body.testType })) {
    return res.status(403).json({ success: false, message: 'Not authorized to create a report for this modality' });
  }

  await runSerializableTransaction(async (tx) => {
    const report = await tx.labReport.create({ data: {
      patientId: patient.id,
      testName,
      testType: req.body.testType || null,
      lab: req.body.lab || null,
      testDate: req.body.testDate ? new Date(req.body.testDate) : null,
      reportDate: req.body.reportDate ? new Date(req.body.reportDate) : null,
      results: req.body.results || null,
      result: req.body.result || null,
      referenceRange: req.body.referenceRange || null,
      status: req.body.status || 'Pending',
      notes: req.body.notes || null,
      fileUrl: req.body.fileUrl || null,
      normalRange: req.body.normalRange || null,
      remarks: req.body.remarks || null,
    } });
    await tx.clinicalAuditEvent.create({ data: { patientId: patient.id, actorId: req.user.id,
      recordType: 'LabReport', recordId: report.id, action: 'CREATED', after: toAuditJson(report) } });
  });

  const updatedPatient = await prisma.patient.findUnique({
    where: { id: patient.id },
    include: { labReports: true, user: { select: SAFE_USER_SELECT } },
  });

  res.status(200).json({
    success: true,
    message: 'Lab report added successfully',
    data: formatPatientResponse(updatedPatient),
  });
});

// Diagnostic staff may only attach to / view reports within their own modality
// (the same scoping getDiagnosticWorkspace/getDiagnosticRecords already enforce
// for reading the report list) — a lab technician cannot touch an X-Ray report
// and vice versa, even though both roles pass requirePatientAccess.
const isDiagnosticRole = (user) => {
  const key = String(user?.subRole || user?.role || '').replace(/[^a-z]/gi, '').toLowerCase();
  return key === 'labtechnician' || key === 'radiologytechnician';
};

exports.uploadLabReportAttachment = asyncHandler(async (req, res) => {
  const patient = req.patientResource;
  const report = await prisma.labReport.findFirst({
    where: { id: req.params.reportId, patientId: patient.id },
  });

  if (!report) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  if (isDiagnosticRole(req.user) && isRadiologyUser(req.user) !== isRadiologyReport(report)) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    return res.status(403).json({ success: false, message: 'Not authorized to attach a file to this report' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const wantsReplace = req.query.replace === 'true' || req.body.replace === 'true' || req.body.replace === true;
  if (report.attachmentStoredName && !wantsReplace) {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(409).json({
      success: false,
      message: `This report already has an attachment (${report.attachmentOriginalName}). Resubmit with replace=true to overwrite it.`,
      existingAttachment: {
        originalName: report.attachmentOriginalName,
        uploadedAt: report.attachmentUploadedAt,
      },
    });
  }

  const previousStoredName = report.attachmentStoredName;
  let updated;
  try {
    updated = await prisma.labReport.update({
      where: { id: report.id },
      data: {
        attachmentStoredName: req.file.filename,
        attachmentOriginalName: req.file.originalname,
        attachmentMimeType: req.file.mimetype,
        attachmentSize: req.file.size,
        attachmentUploadedAt: new Date(),
        attachmentUploadedById: req.user.id,
      },
    });
  } catch (err) {
    await fs.unlink(req.file.path).catch(() => {});
    throw err;
  }

  // Only remove the previous file once the new one is safely recorded.
  if (previousStoredName && previousStoredName !== req.file.filename) {
    await fs.unlink(path.join(REPORT_ATTACHMENT_DIR, previousStoredName)).catch(() => {});
  }

  res.status(200).json({
    success: true,
    message: previousStoredName ? 'Attachment replaced successfully' : 'Attachment uploaded successfully',
    data: {
      attachmentOriginalName: updated.attachmentOriginalName,
      attachmentMimeType: updated.attachmentMimeType,
      attachmentSize: updated.attachmentSize,
      attachmentUploadedAt: updated.attachmentUploadedAt,
    },
  });
});

exports.downloadLabReportAttachment = asyncHandler(async (req, res) => {
  const patient = req.patientResource;
  const report = await prisma.labReport.findFirst({
    where: { id: req.params.reportId, patientId: patient.id },
  });

  if (!report || !report.attachmentStoredName) {
    return res.status(404).json({ success: false, message: 'No attachment found for this report' });
  }

  if (isDiagnosticRole(req.user) && isRadiologyUser(req.user) !== isRadiologyReport(report)) {
    return res.status(403).json({ success: false, message: 'Not authorized to access this report' });
  }

  const filePath = path.join(REPORT_ATTACHMENT_DIR, report.attachmentStoredName);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ success: false, message: 'Attachment file is no longer available' });
  }

  const safeName = (report.attachmentOriginalName || 'report').replace(/[\r\n"]/g, '_');
  res.setHeader('Content-Type', report.attachmentMimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.sendFile(filePath);
});

exports.getPatientStats = asyncHandler(async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { OR: [{ id: req.params.id }, { legacyMongoId: req.params.id }] },
    include: {
      user: { select: { id: true, name: true, email: true } },
      medicalHistory: { where: { isVoided: false } },
      labReports: true,
    },
  });

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
    });
  }

  const appointmentCount = await prisma.appointment.count({ where: { patientId: patient.id } });
  const prescriptionCount = await prisma.prescription.count({ where: { patientId: patient.id } });
  const billings = await prisma.billing.findMany({ where: { patientId: patient.id } });

  const totalBilled = billings.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const totalPaid = billings.reduce((sum, bill) => sum + bill.amountPaid, 0);

  res.status(200).json({
    success: true,
    data: {
      patient: formatPatientResponse(patient),
      stats: {
        totalAppointments: appointmentCount,
        totalPrescriptions: prescriptionCount,
        totalBilled,
        totalPaid,
        outstandingBalance: totalBilled - totalPaid,
        medicalHistoryCount: patient.medicalHistory.length,
        labReportsCount: patient.labReports.length,
        allergiesCount: patient.allergies.length,
      },
    },
  });
});

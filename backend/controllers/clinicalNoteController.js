'use strict';

const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { runSerializableTransaction } = require('../utils/transactions');

const noteInclude = {
  createdBy: { select: { id: true, name: true, role: true } },
  reviewedBy: { select: { id: true, name: true, role: true } },
  versions: {
    orderBy: { version: 'asc' },
    include: { createdBy: { select: { id: true, name: true, role: true } } },
  },
};

const findNote = (patientId, noteId) => prisma.clinicalNote.findFirst({
  where: { id: noteId, patientId }, include: noteInclude,
});

exports.listClinicalNotes = asyncHandler(async (req, res) => {
  const notes = await prisma.clinicalNote.findMany({
    where: { patientId: req.patientResource.id }, include: noteInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, count: notes.length, data: notes });
});

exports.createClinicalDraft = asyncHandler(async (req, res) => {
  const source = req.body.source === 'ai' ? 'ai' : 'record-derived';
  const note = await runSerializableTransaction(async (tx) => {
    const created = await tx.clinicalNote.create({ data: {
      patientId: req.patientResource.id,
      title: req.body.title.trim(), status: 'Draft', source,
      sourceAgent: source === 'ai' ? String(req.body.sourceAgent || 'patient_summary').slice(0, 100) : null,
      createdById: req.user.id,
      versions: { create: {
        version: 1, content: req.body.content.trim(), isAiGenerated: source === 'ai',
        clinicallyConfirmed: false, createdById: req.user.id,
      } },
    } });
    await tx.clinicalAuditEvent.create({ data: {
      patientId: req.patientResource.id, actorId: req.user.id,
      recordType: 'ClinicalNote', recordId: created.id, action: 'DRAFT_CREATED',
      after: { status: 'Draft', source, version: 1 },
    } });
    return created;
  });
  res.status(201).json({
    success: true,
    message: 'Unverified clinical draft saved separately from the medical record',
    data: await findNote(req.patientResource.id, note.id),
  });
});

exports.reviewClinicalNote = asyncHandler(async (req, res) => {
  if (req.body.confirmed !== true) {
    return res.status(400).json({ success: false, code: 'CLINICAL_CONFIRMATION_REQUIRED',
      message: 'Explicit clinician confirmation is required' });
  }
  const existing = await findNote(req.patientResource.id, req.params.noteId);
  if (!existing) return res.status(404).json({ success: false, message: 'Clinical note not found' });
  if (existing.status !== 'Draft') {
    return res.status(409).json({ success: false, message: 'Only an unverified draft can enter initial review' });
  }
  const version = existing.currentVersion + 1;
  await runSerializableTransaction(async (tx) => {
    await tx.clinicalNoteVersion.create({ data: {
      clinicalNoteId: existing.id, version, content: req.body.content.trim(),
      amendmentNote: req.body.amendmentNote?.trim() || 'Initial clinician review',
      isAiGenerated: false, clinicallyConfirmed: true, createdById: req.user.id,
    } });
    await tx.clinicalNote.update({ where: { id: existing.id }, data: {
      status: 'Reviewed', reviewedById: req.user.id, reviewedAt: new Date(), currentVersion: version,
    } });
    await tx.clinicalAuditEvent.create({ data: {
      patientId: req.patientResource.id, actorId: req.user.id,
      recordType: 'ClinicalNote', recordId: existing.id, action: 'CLINICIAN_REVIEWED',
      before: { status: existing.status, version: existing.currentVersion },
      after: { status: 'Reviewed', version }, reason: req.body.amendmentNote?.trim() || 'Initial clinician review',
    } });
  });
  res.json({ success: true, message: 'Clinician-reviewed note version created',
    data: await findNote(req.patientResource.id, existing.id) });
});

exports.amendClinicalNote = asyncHandler(async (req, res) => {
  if (req.body.confirmed !== true) {
    return res.status(400).json({ success: false, code: 'CLINICAL_CONFIRMATION_REQUIRED',
      message: 'Explicit clinician confirmation is required' });
  }
  const existing = await findNote(req.patientResource.id, req.params.noteId);
  if (!existing) return res.status(404).json({ success: false, message: 'Clinical note not found' });
  if (existing.status !== 'Reviewed') {
    return res.status(409).json({ success: false, message: 'Only a reviewed note can be amended' });
  }
  const version = existing.currentVersion + 1;
  await runSerializableTransaction(async (tx) => {
    await tx.clinicalNoteVersion.create({ data: {
      clinicalNoteId: existing.id, version, content: req.body.content.trim(), amendmentNote: req.body.amendmentNote.trim(),
      isAiGenerated: false, clinicallyConfirmed: true, createdById: req.user.id,
    } });
    await tx.clinicalNote.update({ where: { id: existing.id }, data: {
      reviewedById: req.user.id, reviewedAt: new Date(), currentVersion: version,
    } });
    await tx.clinicalAuditEvent.create({ data: {
      patientId: req.patientResource.id, actorId: req.user.id,
      recordType: 'ClinicalNote', recordId: existing.id, action: 'AMENDED',
      before: { version: existing.currentVersion }, after: { version }, reason: req.body.amendmentNote.trim(),
    } });
  });
  res.json({ success: true, message: 'New clinical note version created; prior versions retained',
    data: await findNote(req.patientResource.id, existing.id) });
});

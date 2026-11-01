'use strict';

// Shared integration-test harness. MUST be the first require in a suite: it
// runs the database guard before Prisma is loaded, disables external AI and
// email, starts the real app on an ephemeral port, and tracks every synthetic
// record/file it creates so cleanup touches only fixtures from this run.

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(BACKEND, '.env') });
const envTest = path.join(BACKEND, '.env.test');
if (fs.existsSync(envTest)) require('dotenv').config({ path: envTest });

process.env.NODE_ENV = 'test';
process.env.OPENROUTER_API_KEY = ''; // blank, not deleted: server.js re-runs dotenv, which would restore a deleted key
process.env.EMAIL_USER = '';
process.env.EMAIL_PASS = '';
// A host makes email "configured"; nodemailer.createTransport is replaced below,
// so no connection is ever opened and messages are captured in memory.
process.env.EMAIL_HOST = 'smtp.capture.invalid';
process.env.API_RATE_LIMIT_MAX = process.env.API_RATE_LIMIT_MAX || '100000';

const { useSafeTestDatabase } = require('./databaseGuard');
const { blockedRequests } = require('./noExternalNetwork');
const testDatabase = useSafeTestDatabase();

// Capture outbound mail in memory (password reset) instead of sending it.
const sentMail = [];
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({ sendMail: async (message) => { sentMail.push(message); return { messageId: 'captured' }; } });

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const { generateToken } = require('../../utils/userHelpers');
const { REPORT_ATTACHMENT_DIR } = require('../../middleware/upload');
const { findSensitiveFieldPaths } = require('../../utils/safeUser');
const { flushAudits } = require('../../utils/audit');

const AVATAR_DIR = path.join(BACKEND, 'private-uploads', 'avatars');
const PDF_BYTES = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(64, 0)]);
const PNG_BYTES = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32, 0)]);

function createHarness(label) {
  const run = `${label}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  let counter = 0;
  const tag = () => `${run}-${(counter += 1)}`;
  const tracked = { users: [], wards: [], medicines: [], files: [] };
  let server;
  let baseUrl;
  let app;

  const start = async () => {
    await prisma.$connect();
    const [{ current_database: connected }] = await prisma.$queryRaw`SELECT current_database()`;
    if (connected !== testDatabase.database) throw new Error('Connected database is not the confirmed test database');
    app = require('../../server');
    server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  };

  const request = async (apiPath, { token, method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    let json = null;
    try { json = JSON.parse(buffer.toString('utf8')); } catch (_error) { json = null; }
    return { status: response.status, json, buffer, headers: response.headers };
  };

  const upload = async (apiPath, { token, field = 'attachment', filename = 'synthetic.pdf', mimetype = 'application/pdf', buffer = PDF_BYTES, fields = {} } = {}) => {
    const form = new FormData();
    if (buffer) form.append(field, new Blob([buffer], { type: mimetype }), filename);
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    const response = await fetch(`${baseUrl}${apiPath}`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
    return { status: response.status, json: await response.json().catch(() => null) };
  };

  const createUser = async (name, role, subRole = null, extra = {}) => {
    const user = await prisma.user.create({ data: {
      name: `Synthetic ${name}`, email: `integration-${tag()}@medilink.invalid`, password: 'integration-test-only-not-a-real-hash',
      phone: `IT-${tag()}`, role, subRole, ...extra,
    } });
    tracked.users.push(user.id);
    return { user, token: generateToken(user) };
  };

  const createPatient = async (name = 'patient', data = {}) => {
    const principal = await createUser(name, 'Patient');
    const profile = await prisma.patient.create({ data: { userId: principal.user.id, patientId: `IT-P-${tag()}`, allergies: [], ...data } });
    return { ...principal, profile };
  };

  const createDoctor = async (name = 'doctor', data = {}) => {
    const principal = await createUser(name, 'Doctor');
    const profile = await prisma.doctor.create({ data: {
      userId: principal.user.id, specialization: 'General Medicine', qualification: 'MBBS', experience: 5,
      licenseNumber: `IT-LIC-${tag()}`, department: 'General Medicine', consultationFee: 500, ...data,
    } });
    return { ...principal, profile };
  };

  // A future date (UTC midnight) and its weekday name, for schedule fixtures.
  const futureDay = (offsetDays = 14) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    date.setUTCHours(0, 0, 0, 0);
    return { date, text: date.toISOString().slice(0, 10), weekday: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) };
  };

  let slotCounter = 0;
  const createAppointment = async (patientProfileId, doctorProfileId, data = {}) => {
    slotCounter += 1;
    const minute = String(slotCounter % 60).padStart(2, '0');
    return prisma.appointment.create({ data: {
      patientId: patientProfileId, doctorId: doctorProfileId, appointmentDate: futureDay(20 + Math.floor(slotCounter / 60)).date,
      startTime: `07:${minute}`, endTime: `07:${minute}`, type: 'Consultation', status: 'Scheduled', bookingKey: `integration-${tag()}`, ...data,
    } });
  };

  const createMedicine = async (data = {}) => {
    const medicine = await prisma.medicine.create({ data: {
      medicineId: `IT-MED-${tag()}`, name: `Synthetic Medicine ${tag()}`, genericName: 'Synthetic Compound', manufacturer: 'Synthetic Labs',
      category: 'Analgesic', dosageForm: 'Tablet', unitPrice: 10, stockQuantity: 100, expiryDate: new Date(Date.now() + 365 * 86400000), isActive: true, ...data,
    } });
    tracked.medicines.push(medicine.id);
    return medicine;
  };

  const createWard = async (data = {}) => {
    const number = `IT-WARD-${tag()}`;
    const ward = await prisma.ward.create({ data: {
      wardNumber: number, wardName: `Synthetic Ward ${number}`, wardType: 'General', totalBeds: 2, availableBeds: 2, facilities: [], dailyRate: 1000,
      beds: { create: [{ bedNumber: `${number}-1` }, { bedNumber: `${number}-2` }] }, ...data,
    }, include: { beds: true } });
    tracked.wards.push(ward.id);
    return ward;
  };

  const trackWard = (id) => tracked.wards.push(id);
  const trackMedicine = (id) => tracked.medicines.push(id);
  const trackUser = (id) => tracked.users.push(id);
  const trackFile = (absolutePath) => tracked.files.push(absolutePath);

  const tokens = {
    malformed: 'not-a-jwt',
    wrongSecret: (user) => jwt.sign({ id: user.id, role: user.role }, crypto.randomBytes(48).toString('hex'), { expiresIn: '1h' }),
    expired: (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: -60 }),
  };

  const stop = async () => {
    const attachments = await prisma.labReport.findMany({
      where: { patient: { userId: { in: tracked.users } }, attachmentStoredName: { not: null } }, select: { attachmentStoredName: true },
    });
    const avatars = await prisma.user.findMany({ where: { id: { in: tracked.users }, avatar: { startsWith: '/uploads/avatars/' } }, select: { avatar: true } });
    const files = [
      ...tracked.files,
      ...attachments.map((r) => path.join(REPORT_ATTACHMENT_DIR, r.attachmentStoredName)),
      ...avatars.map((u) => path.join(AVATAR_DIR, path.basename(u.avatar))),
    ];
    await Promise.all(files.map((file) => fs.promises.unlink(file).catch(() => {})));

    // Audit rows are written after responses finish: wait for in-flight writes,
    // then remove rows tied to this run's users/patients.
    await new Promise((resolve) => setTimeout(resolve, 50));
    await flushAudits();
    const fixturePatients = await prisma.patient.findMany({ where: { userId: { in: tracked.users } }, select: { id: true } });
    await prisma.auditEvent.deleteMany({ where: { OR: [
      { actorId: { in: tracked.users } }, { patientId: { in: fixturePatients.map((p) => p.id) } }, { resourceId: { in: tracked.users } },
    ] } });
    await prisma.clinicalNote.deleteMany({ where: { OR: [{ createdById: { in: tracked.users } }, { patient: { userId: { in: tracked.users } } }] } });
    await prisma.user.deleteMany({ where: { id: { in: tracked.users } } });
    if (tracked.wards.length) await prisma.ward.deleteMany({ where: { id: { in: tracked.wards } } });
    if (tracked.medicines.length) {
      await prisma.prescriptionMedicine.deleteMany({ where: { medicineId: { in: tracked.medicines } } });
      await prisma.medicine.deleteMany({ where: { id: { in: tracked.medicines } } });
    }
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await prisma.$disconnect();
  };

  return {
    prisma, testDatabase, sentMail, blockedRequests, flushAudits, start, stop, request, upload, tag, tokens,
    createUser, createPatient, createDoctor, createAppointment, createMedicine, createWard, futureDay,
    trackWard, trackMedicine, trackUser, trackFile, findSensitiveFieldPaths, PDF_BYTES, PNG_BYTES, AVATAR_DIR,
  };
}

module.exports = { createHarness };

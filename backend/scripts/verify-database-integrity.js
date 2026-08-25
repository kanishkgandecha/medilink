'use strict';
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function verifyCatalog() {
  const indexes = await prisma.$queryRaw`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'Appointment_active_doctor_slot_key',
        'Appointment_bookingKey_key',
        'Billing_sourceKey_key',
        'Bed_one_active_bed_per_patient_key'
      )`;
  const names = new Set(indexes.map((row) => row.indexname));
  for (const required of ['Appointment_active_doctor_slot_key', 'Appointment_bookingKey_key', 'Billing_sourceKey_key', 'Bed_one_active_bed_per_patient_key']) {
    if (!names.has(required)) throw new Error(`Missing required database index: ${required}`);
  }
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename IN ('AiAuditEvent', 'ClinicalAuditEvent', 'ClinicalNote', 'ClinicalNoteVersion')`;
  if (tables.length !== 4) throw new Error('Missing audit or clinical governance tables');
}

async function verifyActiveSlotConstraint() {
  const suffix = crypto.randomBytes(5).toString('hex');
  try {
    await prisma.$transaction(async (tx) => {
      const patientUser = await tx.user.create({ data: {
        name: 'Migration Smoke Patient', email: `smoke-patient-${suffix}@example.invalid`, password: 'not-a-real-login',
        role: 'Patient', phone: `91${suffix.slice(0, 8)}`,
      } });
      const patient = await tx.patient.create({ data: { userId: patientUser.id, patientId: `SMOKE-P-${suffix}` } });
      const doctorUser = await tx.user.create({ data: {
        name: 'Migration Smoke Doctor', email: `smoke-doctor-${suffix}@example.invalid`, password: 'not-a-real-login',
        role: 'Doctor', phone: `92${suffix.slice(0, 8)}`,
      } });
      const doctor = await tx.doctor.create({ data: { userId: doctorUser.id, specialization: 'General Medicine',
        qualification: 'MBBS', experience: 1, licenseNumber: `SMOKE-L-${suffix}`, department: 'General Medicine', consultationFee: 0 } });
      const base = { patientId: patient.id, doctorId: doctor.id, appointmentDate: new Date('2099-01-01'),
        startTime: '09:00', endTime: '09:30', type: 'Consultation', priority: 'Normal' };
      await tx.appointment.create({ data: { ...base, appointmentId: `SMOKE-A1-${suffix}`, bookingKey: `smoke-key-1-${suffix}` } });
      await tx.appointment.create({ data: { ...base, appointmentId: `SMOKE-A2-${suffix}`, bookingKey: `smoke-key-2-${suffix}` } });
    });
    throw new Error('Active-slot uniqueness constraint did not reject a duplicate');
  } catch (error) {
    if (error.code !== 'P2002') throw error;
  }
}

async function main() {
  await verifyCatalog();
  await verifyActiveSlotConstraint();
  const migrationRows = await prisma.$queryRaw`SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
  if (migrationRows.length < 6) throw new Error('Not all expected migrations are recorded as complete');
  console.log(`Database integrity verified: ${migrationRows.length} migrations, audit/governance tables, idempotency indexes, bed constraints, and active-slot uniqueness.`);
}

main().finally(() => prisma.$disconnect());

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  const startTime = Date.now();
  console.log('===========================================================');
  console.log('🔍 MEDILINK POST-MIGRATION VALIDATION REPORT');
  console.log('===========================================================');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI missing');
    process.exit(1);
  }

  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db();
  await prisma.$connect();

  const entityMap = [
    { name: 'Users', mongoCol: 'users', pgModel: prisma.user },
    { name: 'Doctors', mongoCol: 'doctors', pgModel: prisma.doctor },
    { name: 'Patients', mongoCol: 'patients', pgModel: prisma.patient },
    { name: 'Appointments', mongoCol: 'appointments', pgModel: prisma.appointment },
    { name: 'Prescriptions', mongoCol: 'prescriptions', pgModel: prisma.prescription },
    { name: 'Medicines', mongoCol: 'medicines', pgModel: prisma.medicine },
    { name: 'Billing', mongoCol: 'billings', altCol: 'billing', pgModel: prisma.billing },
    { name: 'Staff', mongoCol: 'staffs', altCol: 'staff', pgModel: prisma.staff },
    { name: 'Wards', mongoCol: 'wards', pgModel: prisma.ward },
  ];

  let totalMongo = 0;
  let totalPostgres = 0;
  let errors = 0;
  let warnings = 0;
  const countsReport = {};

  console.log('\n--- 1. Record Counts Audit ---');
  for (const entity of entityMap) {
    let mongoCount = 0;
    try {
      const collections = await mongoDb.listCollections().toArray();
      const colNames = collections.map((c) => c.name);

      let targetCol = entity.mongoCol;
      if (!colNames.includes(targetCol) && entity.altCol && colNames.includes(entity.altCol)) {
        targetCol = entity.altCol;
      }

      if (colNames.includes(targetCol)) {
        mongoCount = await mongoDb.collection(targetCol).countDocuments();
      }
    } catch (e) {
      mongoCount = 0;
    }

    const pgCount = await entity.pgModel.count();
    countsReport[entity.name] = { mongo: mongoCount, postgres: pgCount };
    totalMongo += mongoCount;
    totalPostgres += pgCount;

    const matchSymbol = mongoCount === pgCount ? '✓' : '⚠️';
    if (mongoCount !== pgCount) warnings++;
    console.log(`  ${matchSymbol} ${entity.name.padEnd(16)} Mongo: ${mongoCount.toString().padStart(5)} | Postgres: ${pgCount.toString().padStart(5)}`);
  }

  console.log('\n--- 2. Foreign Key Integrity Audit ---');
  const fkAudit = [];

  // Patient -> User
  const orphanedPatients = await prisma.patient.count({
    where: { user: { is: null } },
  });
  fkAudit.push({ relation: 'Patient → User', orphaned: orphanedPatients });

  // Doctor -> User
  const orphanedDoctors = await prisma.doctor.count({
    where: { user: { is: null } },
  });
  fkAudit.push({ relation: 'Doctor → User', orphaned: orphanedDoctors });

  // Appointment -> Patient / Doctor
  const orphanedAppointments = await prisma.appointment.count({
    where: { OR: [{ patient: { is: null } }, { doctor: { is: null } }] },
  });
  fkAudit.push({ relation: 'Appointment → Patient & Doctor', orphaned: orphanedAppointments });

  // Prescription -> Patient / Doctor
  const orphanedRx = await prisma.prescription.count({
    where: { OR: [{ patient: { is: null } }, { doctor: { is: null } }] },
  });
  fkAudit.push({ relation: 'Prescription → Patient & Doctor', orphaned: orphanedRx });

  // Billing -> Patient
  const orphanedBills = await prisma.billing.count({
    where: { patient: { is: null } },
  });
  fkAudit.push({ relation: 'Billing → Patient', orphaned: orphanedBills });

  // Staff -> User
  const orphanedStaff = await prisma.staff.count({
    where: { user: { is: null } },
  });
  fkAudit.push({ relation: 'Staff → User', orphaned: orphanedStaff });

  for (const check of fkAudit) {
    const symbol = check.orphaned === 0 ? '✓' : '❌';
    if (check.orphaned > 0) errors++;
    console.log(`  ${symbol} ${check.relation.padEnd(32)} Orphaned: ${check.orphaned}`);
  }

  const durationMs = Date.now() - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  console.log('\n===========================================================');
  console.log('📋 FINAL VALIDATION REPORT');
  console.log('===========================================================');
  console.log(`Total Mongo Records   : ${totalMongo}`);
  console.log(`Total Postgres Rows   : ${totalPostgres}`);
  console.log(`Errors Found          : ${errors}`);
  console.log(`Warnings              : ${warnings}`);
  console.log(`Validation Duration   : ${durationSec}s`);
  console.log(`Overall Status        : ${errors === 0 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log('===========================================================\n');

  await mongoClient.close();
  await prisma.$disconnect();
}

if (require.main === module) {
  verifyMigration().catch((err) => {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
  });
}

module.exports = verifyMigration;

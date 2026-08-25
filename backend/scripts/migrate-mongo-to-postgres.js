require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_e) {}

const { MongoClient } = require('mongodb');
const { PrismaClient } = require('@prisma/client');
const backupMongo = require('./backup-mongo');

const prisma = new PrismaClient();

// Internal ID mapping table: mongoIdString -> postgresUuid
const idMap = new Map();

function getUuidForMongoId(mongoIdStr) {
  if (!mongoIdStr) return null;
  const str = mongoIdStr.toString();
  if (!idMap.has(str)) {
    idMap.set(str, require('crypto').randomUUID());
  }
  return idMap.get(str);
}

function parseEnum(enumObj, value, defaultValue) {
  if (!value) return defaultValue;
  const valStr = String(value).trim();
  for (const key of Object.keys(enumObj)) {
    if (enumObj[key] === valStr || key === valStr || key.toLowerCase() === valStr.toLowerCase()) {
      return enumObj[key];
    }
  }
  return defaultValue;
}

async function runMigration() {
  const startTime = Date.now();
  console.log('===========================================================');
  console.log('🚀 MEDILINK DATABASE MIGRATION: MONGODB → POSTGRESQL');
  console.log('===========================================================');

  // Step 1: Pre-Migration Backup
  console.log('\n--- Step 1: Running Pre-Migration Backup ---');
  await backupMongo();

  // Step 2: Database Connections
  console.log('\n--- Step 2: Connecting to Databases ---');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI missing in environment');
    process.exit(1);
  }

  const mongoClient = new MongoClient(mongoUri, { readPreference: 'secondaryPreferred' });
  await mongoClient.connect();
  const mongoDb = mongoClient.db();
  console.log('✅ Connected to MongoDB (Read-Only)');

  await prisma.$connect();
  console.log('✅ Connected to PostgreSQL (Prisma)');

  const stats = {
    collectionsMigrated: 0,
    recordsMigrated: {},
    totalMongoRecords: 0,
    totalPostgresRows: 0,
    successCount: 0,
    skippedCount: 0,
    errorCount: 0,
  };

  try {
    // Dynamic Collection Discovery
    const liveCollections = await mongoDb.listCollections().toArray();
    const colNames = liveCollections.map((c) => c.name);
    console.log(`\n🔍 Discovered MongoDB Collections (${colNames.length}):`, colNames.join(', '));

    // Phase 1: Users
    if (colNames.includes('users')) {
      console.log('\n--- Migrating Users ---');
      const docs = await mongoDb.collection('users').find({}).toArray();
      stats.recordsMigrated['Users'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const uuid = getUuidForMongoId(mongoIdStr);

        const existing = await prisma.user.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { email: doc.email.toLowerCase() }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Users']++;
          continue;
        }

        let addressStreet = doc.address?.street || null;
        let addressCity = doc.address?.city || null;
        let addressState = doc.address?.state || null;
        let addressZip = doc.address?.zipCode || null;
        let addressCountry = doc.address?.country || null;

        await prisma.user.create({
          data: {
            id: uuid,
            legacyMongoId: mongoIdStr,
            name: doc.name || 'Unknown User',
            email: (doc.email || `user_${uuid}@medilink.com`).toLowerCase(),
            password: doc.password || '$2a$10$UnusedPlaceholderPasswordHash',
            role: doc.role || 'Patient',
            subRole: doc.subRole || null,
            phone: doc.phone || '0000000000',
            street: addressStreet,
            city: addressCity,
            state: addressState,
            zipCode: addressZip,
            country: addressCountry,
            dateOfBirth: doc.dateOfBirth ? new Date(doc.dateOfBirth) : null,
            gender: doc.gender || null,
            avatar: doc.avatar || '',
            isActive: doc.isActive !== undefined ? Boolean(doc.isActive) : true,
            resetPasswordToken: doc.resetPasswordToken || null,
            resetPasswordExpire: doc.resetPasswordExpire ? new Date(doc.resetPasswordExpire) : null,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          },
        });

        stats.recordsMigrated['Users']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Users']} Users`);
    }

    // Phase 2: Doctors
    if (colNames.includes('doctors')) {
      console.log('\n--- Migrating Doctors ---');
      const docs = await mongoDb.collection('doctors').find({}).toArray();
      stats.recordsMigrated['Doctors'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const docUuid = getUuidForMongoId(mongoIdStr);
        const userUuid = getUuidForMongoId(doc.userId);

        if (!userUuid) {
          console.warn(`⚠️ Doctor ${mongoIdStr} missing valid userId link. Skipping.`);
          stats.errorCount++;
          continue;
        }

        const existing = await prisma.doctor.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { userId: userUuid }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Doctors']++;
          continue;
        }

        await prisma.doctor.create({
          data: {
            id: docUuid,
            legacyMongoId: mongoIdStr,
            userId: userUuid,
            specialization: doc.specialization || 'General',
            qualification: doc.qualification || 'MBBS',
            experience: Number(doc.experience || 0),
            licenseNumber: doc.licenseNumber || `LIC-${docUuid.slice(0, 8)}`,
            department: doc.department || 'General Medicine',
            consultationFee: Number(doc.consultationFee || 0),
            availability: doc.availability || null,
            onCallShifts: doc.onCallShifts || null,
            rating: Number(doc.rating || 0),
            totalRatings: Number(doc.totalRatings || 0),
            isAvailable: doc.isAvailable !== undefined ? Boolean(doc.isAvailable) : true,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          },
        });

        stats.recordsMigrated['Doctors']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Doctors']} Doctors`);
    }

    // Phase 3: Patients
    if (colNames.includes('patients')) {
      console.log('\n--- Migrating Patients ---');
      const docs = await mongoDb.collection('patients').find({}).toArray();
      stats.recordsMigrated['Patients'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const patientUuid = getUuidForMongoId(mongoIdStr);
        const userUuid = getUuidForMongoId(doc.userId);

        if (!userUuid) {
          console.warn(`⚠️ Patient ${mongoIdStr} missing valid userId link. Skipping.`);
          stats.errorCount++;
          continue;
        }

        const existing = await prisma.patient.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { userId: userUuid }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Patients']++;
          continue;
        }

        await prisma.patient.create({
          data: {
            id: patientUuid,
            legacyMongoId: mongoIdStr,
            userId: userUuid,
            patientId: doc.patientId || `PT-${patientUuid.slice(0, 8)}`,
            bloodGroup: doc.bloodGroup || null,
            emergencyContact: doc.emergencyContact || null,
            allergies: Array.isArray(doc.allergies) ? doc.allergies : [],
            insuranceInfo: doc.insuranceInfo || null,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
            medicalHistory: {
              create: (doc.medicalHistory || []).map((mh) => ({
                condition: mh.condition || 'Unspecified',
                diagnosedDate: mh.diagnosedDate ? new Date(mh.diagnosedDate) : new Date(),
                status: mh.status || 'Active',
                notes: mh.notes || null,
                addedAt: mh.addedAt ? new Date(mh.addedAt) : new Date(),
              })),
            },
            currentMedications: {
              create: (doc.currentMedications || []).map((cm) => ({
                medicine: cm.medicine || null,
                dosage: cm.dosage || null,
                frequency: cm.frequency || null,
                startDate: cm.startDate ? new Date(cm.startDate) : null,
                endDate: cm.endDate ? new Date(cm.endDate) : null,
                prescribedBy: cm.prescribedBy || null,
              })),
            },
            labReports: {
              create: (doc.labReports || []).map((lr) => ({
                testName: lr.testName || 'Lab Test',
                testType: lr.testType || null,
                lab: lr.lab || null,
                testDate: lr.testDate ? new Date(lr.testDate) : null,
                reportDate: lr.reportDate ? new Date(lr.reportDate) : null,
                results: lr.results || null,
                result: lr.result || null,
                referenceRange: lr.referenceRange || null,
                status: lr.status || 'Pending',
                notes: lr.notes || null,
                fileUrl: lr.fileUrl || null,
                normalRange: lr.normalRange || null,
                remarks: lr.remarks || null,
                addedAt: lr.addedAt ? new Date(lr.addedAt) : new Date(),
              })),
            },
            imagingData: {
              create: (doc.imagingData || []).map((img) => ({
                type: img.type || null,
                date: img.date ? new Date(img.date) : null,
                findings: img.findings || null,
                fileUrl: img.fileUrl || null,
              })),
            },
            admissionHistory: {
              create: (doc.admissionHistory || []).map((adm) => ({
                admissionDate: adm.admissionDate ? new Date(adm.admissionDate) : null,
                dischargeDate: adm.dischargeDate ? new Date(adm.dischargeDate) : null,
                reason: adm.reason || null,
                ward: adm.ward || null,
                attendingDoctor: adm.attendingDoctor || null,
              })),
            },
          },
        });

        stats.recordsMigrated['Patients']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Patients']} Patients`);
    }

    // Phase 4: Medicines
    if (colNames.includes('medicines')) {
      console.log('\n--- Migrating Medicines ---');
      const docs = await mongoDb.collection('medicines').find({}).toArray();
      stats.recordsMigrated['Medicines'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const medUuid = getUuidForMongoId(mongoIdStr);

        const existing = await prisma.medicine.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { medicineId: doc.medicineId }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Medicines']++;
          continue;
        }

        await prisma.medicine.create({
          data: {
            id: medUuid,
            legacyMongoId: mongoIdStr,
            medicineId: doc.medicineId || `MED-${medUuid.slice(0, 8)}`,
            name: doc.name || 'Unnamed Medicine',
            genericName: doc.genericName || doc.name || 'Generic Name',
            manufacturer: doc.manufacturer || 'General Pharma',
            category: doc.category || 'Other',
            dosageForm: doc.dosageForm || 'Tablet',
            strength: doc.strength || null,
            unitPrice: Number(doc.unitPrice || 0),
            stockQuantity: Number(doc.stockQuantity || 0),
            reorderLevel: Number(doc.reorderLevel || 50),
            expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            batchNumber: doc.batchNumber || null,
            supplier: doc.supplier || null,
            storageConditions: doc.storageConditions || null,
            sideEffects: Array.isArray(doc.sideEffects) ? doc.sideEffects : [],
            contraindications: Array.isArray(doc.contraindications) ? doc.contraindications : [],
            prescriptionRequired: doc.prescriptionRequired !== undefined ? Boolean(doc.prescriptionRequired) : true,
            isActive: doc.isActive !== undefined ? Boolean(doc.isActive) : true,
            lastRestocked: doc.lastRestocked ? new Date(doc.lastRestocked) : null,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          },
        });

        stats.recordsMigrated['Medicines']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Medicines']} Medicines`);
    }

    // Phase 5: Wards & Beds
    if (colNames.includes('wards')) {
      console.log('\n--- Migrating Wards & Beds ---');
      const docs = await mongoDb.collection('wards').find({}).toArray();
      stats.recordsMigrated['Wards'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const wardUuid = getUuidForMongoId(mongoIdStr);
        const nurseUuid = doc.nurseInCharge ? getUuidForMongoId(doc.nurseInCharge) : null;

        const existing = await prisma.ward.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { wardNumber: doc.wardNumber }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Wards']++;
          continue;
        }

        await prisma.ward.create({
          data: {
            id: wardUuid,
            legacyMongoId: mongoIdStr,
            wardNumber: doc.wardNumber || `W-${wardUuid.slice(0, 4)}`,
            wardName: doc.wardName || 'General Ward',
            wardType: doc.wardType || 'General',
            department: doc.department || null,
            floor: doc.floor ? Number(doc.floor) : null,
            totalBeds: Number(doc.totalBeds || 10),
            availableBeds: Number(doc.availableBeds || 10),
            gender: doc.gender || null,
            facilities: Array.isArray(doc.facilities) ? doc.facilities : [],
            dailyRate: Number(doc.dailyRate || 500),
            nurseInChargeId: nurseUuid,
            isActive: doc.isActive !== undefined ? Boolean(doc.isActive) : true,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            beds: {
              create: (doc.beds || []).map((b) => ({
                bedNumber: b.bedNumber || 'B1',
                isOccupied: Boolean(b.isOccupied),
                patientId: b.patient ? getUuidForMongoId(b.patient) : null,
                admissionDate: b.admissionDate ? new Date(b.admissionDate) : null,
                expectedDischargeDate: b.expectedDischargeDate ? new Date(b.expectedDischargeDate) : null,
              })),
            },
          },
        });

        stats.recordsMigrated['Wards']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Wards']} Wards`);
    }

    // Phase 6: Staff
    if (colNames.includes('staffs') || colNames.includes('staff')) {
      const colName = colNames.includes('staffs') ? 'staffs' : 'staff';
      console.log(`\n--- Migrating Staff (${colName}) ---`);
      const docs = await mongoDb.collection(colName).find({}).toArray();
      stats.recordsMigrated['Staff'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const staffUuid = getUuidForMongoId(mongoIdStr);
        const userUuid = getUuidForMongoId(doc.userId);
        const supervisorUuid = doc.supervisor ? getUuidForMongoId(doc.supervisor) : null;

        if (!userUuid) {
          console.warn(`⚠️ Staff ${mongoIdStr} missing valid userId. Skipping.`);
          stats.errorCount++;
          continue;
        }

        const existing = await prisma.staff.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { userId: userUuid }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Staff']++;
          continue;
        }

        await prisma.staff.create({
          data: {
            id: staffUuid,
            legacyMongoId: mongoIdStr,
            userId: userUuid,
            employeeId: doc.employeeId || `EMP-${staffUuid.slice(0, 6)}`,
            designation: doc.designation || 'Staff Member',
            department: doc.department || 'Administration',
            qualification: doc.qualification || null,
            joiningDate: doc.joiningDate ? new Date(doc.joiningDate) : new Date(),
            employmentType: doc.employmentType || 'Full_Time',
            shift: doc.shift || 'Morning',
            workSchedule: doc.workSchedule || null,
            salary: doc.salary || null,
            supervisorId: supervisorUuid,
            skills: Array.isArray(doc.skills) ? doc.skills : [],
            certifications: doc.certifications || null,
            performance: doc.performance || null,
            isActive: doc.isActive !== undefined ? Boolean(doc.isActive) : true,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
          },
        });

        stats.recordsMigrated['Staff']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Staff']} Staff members`);
    }

    // Phase 7: Appointments
    if (colNames.includes('appointments')) {
      console.log('\n--- Migrating Appointments ---');
      const docs = await mongoDb.collection('appointments').find({}).toArray();
      stats.recordsMigrated['Appointments'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const aptUuid = getUuidForMongoId(mongoIdStr);
        const patientUuid = getUuidForMongoId(doc.patient);
        const doctorUuid = getUuidForMongoId(doc.doctor);
        const createdByUuid = doc.createdBy ? getUuidForMongoId(doc.createdBy) : null;

        if (!patientUuid || !doctorUuid) {
          console.warn(`⚠️ Appointment ${mongoIdStr} missing patient or doctor relation. Skipping.`);
          stats.errorCount++;
          continue;
        }

        const existing = await prisma.appointment.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { appointmentId: doc.appointmentId }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Appointments']++;
          continue;
        }

        const startTime = doc.timeSlot?.startTime || '09:00';
        const endTime = doc.timeSlot?.endTime || '09:30';

        await prisma.appointment.create({
          data: {
            id: aptUuid,
            legacyMongoId: mongoIdStr,
            appointmentId: doc.appointmentId || `APT-${aptUuid.slice(0, 8)}`,
            patientId: patientUuid,
            doctorId: doctorUuid,
            appointmentDate: doc.appointmentDate ? new Date(doc.appointmentDate) : new Date(),
            startTime,
            endTime,
            type: doc.type || 'Consultation',
            status: doc.status || 'Scheduled',
            priority: doc.priority || 'Normal',
            symptoms: doc.symptoms || null,
            diagnosis: doc.diagnosis || null,
            notes: doc.notes || null,
            operationTheatre: doc.operationTheatre || null,
            cancelReason: doc.cancelReason || null,
            consultationFee: doc.consultationFee ? Number(doc.consultationFee) : null,
            paid: Boolean(doc.paid),
            paymentMethod: doc.paymentMethod || null,
            createdById: createdByUuid,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
          },
        });

        stats.recordsMigrated['Appointments']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Appointments']} Appointments`);
    }

    // Phase 8: Prescriptions
    if (colNames.includes('prescriptions')) {
      console.log('\n--- Migrating Prescriptions ---');
      const docs = await mongoDb.collection('prescriptions').find({}).toArray();
      stats.recordsMigrated['Prescriptions'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const rxUuid = getUuidForMongoId(mongoIdStr);
        const patientUuid = getUuidForMongoId(doc.patient);
        const doctorUuid = getUuidForMongoId(doc.doctor);
        const appointmentUuid = doc.appointment ? getUuidForMongoId(doc.appointment) : null;

        if (!patientUuid || !doctorUuid) {
          console.warn(`⚠️ Prescription ${mongoIdStr} missing patient or doctor relation. Skipping.`);
          stats.errorCount++;
          continue;
        }

        const existing = await prisma.prescription.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { prescriptionId: doc.prescriptionId }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Prescriptions']++;
          continue;
        }

        await prisma.prescription.create({
          data: {
            id: rxUuid,
            legacyMongoId: mongoIdStr,
            prescriptionId: doc.prescriptionId || `RX-${rxUuid.slice(0, 8)}`,
            patientId: patientUuid,
            doctorId: doctorUuid,
            appointmentId: appointmentUuid,
            diagnosis: doc.diagnosis || null,
            symptoms: doc.symptoms || null,
            labTests: Array.isArray(doc.labTests) ? doc.labTests : [],
            status: doc.status || 'Pending',
            refillsAllowed: Number(doc.refillsAllowed || 0),
            refillsUsed: Number(doc.refillsUsed || 0),
            validUntil: doc.validUntil ? new Date(doc.validUntil) : null,
            notes: doc.notes || null,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            medicines: {
              create: (doc.medicines || []).map((m) => ({
                medicineId: getUuidForMongoId(m.medicine),
                dosage: m.dosage || '1 tablet',
                frequency: m.frequency || 'Once daily',
                duration: m.duration || '5 days',
                instructions: m.instructions || null,
                quantity: Number(m.quantity || 1),
                dispensedQuantity: Number(m.dispensedQuantity || 0),
                dispensedById: m.dispensedBy ? getUuidForMongoId(m.dispensedBy) : null,
                dispensedAt: m.dispensedAt ? new Date(m.dispensedAt) : null,
              })),
            },
          },
        });

        stats.recordsMigrated['Prescriptions']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Prescriptions']} Prescriptions`);
    }

    // Phase 9: Billing
    if (colNames.includes('billings') || colNames.includes('billing')) {
      const colName = colNames.includes('billings') ? 'billings' : 'billing';
      console.log(`\n--- Migrating Billing (${colName}) ---`);
      const docs = await mongoDb.collection(colName).find({}).toArray();
      stats.recordsMigrated['Billing'] = 0;
      stats.totalMongoRecords += docs.length;

      for (const doc of docs) {
        const mongoIdStr = doc._id.toString();
        const billUuid = getUuidForMongoId(mongoIdStr);
        const patientUuid = getUuidForMongoId(doc.patient);
        const generatedByUuid = doc.generatedBy ? getUuidForMongoId(doc.generatedBy) : null;
        const appointmentUuid = doc.relatedAppointmentId ? getUuidForMongoId(doc.relatedAppointmentId) : null;

        if (!patientUuid) {
          console.warn(`⚠️ Bill ${mongoIdStr} missing patient relation. Skipping.`);
          stats.errorCount++;
          continue;
        }

        const existing = await prisma.billing.findFirst({
          where: { OR: [{ legacyMongoId: mongoIdStr }, { billNumber: doc.billNumber }] },
        });

        if (existing) {
          idMap.set(mongoIdStr, existing.id);
          stats.skippedCount++;
          stats.recordsMigrated['Billing']++;
          continue;
        }

        await prisma.billing.create({
          data: {
            id: billUuid,
            legacyMongoId: mongoIdStr,
            billNumber: doc.billNumber || `BILL-${billUuid.slice(0, 8)}`,
            patientId: patientUuid,
            billDate: doc.billDate ? new Date(doc.billDate) : new Date(),
            billType: doc.billType || 'Other',
            subtotal: Number(doc.subtotal || doc.totalAmount || 0),
            discount: Number(doc.discount || 0),
            tax: Number(doc.tax || 0),
            totalAmount: Number(doc.totalAmount || 0),
            amountPaid: Number(doc.amountPaid || 0),
            balance: Number(doc.balance || 0),
            paymentStatus: doc.paymentStatus || 'Unpaid',
            paymentMethod: doc.paymentMethod || null,
            insuranceClaim: doc.insuranceClaim || null,
            createdByRole: doc.createdByRole || null,
            generatedById: generatedByUuid,
            relatedAppointmentId: appointmentUuid,
            notes: doc.notes || null,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : new Date(),
            items: {
              create: (doc.items || []).map((item) => ({
                description: item.description || 'Medical Service',
                category: item.category || 'Other',
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.unitPrice || 0),
                amount: Number(item.amount || 0),
              })),
            },
            payments: {
              create: (doc.payments || []).map((pay) => ({
                amount: Number(pay.amount || 0),
                paymentMethod: pay.paymentMethod || 'Cash',
                transactionId: pay.transactionId || null,
                notes: pay.notes || null,
                paymentDate: pay.paymentDate ? new Date(pay.paymentDate) : new Date(),
              })),
            },
          },
        });

        stats.recordsMigrated['Billing']++;
        stats.successCount++;
      }
      stats.collectionsMigrated++;
      console.log(`✅ Migrated ${stats.recordsMigrated['Billing']} Billing Records`);
    }

    const durationMs = Date.now() - startTime;
    const durationSec = (durationMs / 1000).toFixed(2);
    const successPercent = stats.totalMongoRecords > 0
      ? ((stats.successCount / stats.totalMongoRecords) * 100).toFixed(1)
      : '100';

    console.log('\n===========================================================');
    console.log('🎉 DATA MIGRATION SUMMARY REPORT');
    console.log('===========================================================');
    console.log(`Collections Processed : ${stats.collectionsMigrated}`);
    console.log(`Total Mongo Records   : ${stats.totalMongoRecords}`);
    console.log(`Migrated / Updated    : ${stats.successCount}`);
    console.log(`Already Present       : ${stats.skippedCount}`);
    console.log(`Errors / Unlinked     : ${stats.errorCount}`);
    console.log(`Success Rate          : ${successPercent}%`);
    console.log(`Total Time Taken      : ${durationSec}s`);
    console.log('===========================================================\n');
  } catch (err) {
    console.error('❌ FATAL MIGRATION ERROR:', err);
    process.exit(1);
  } finally {
    await mongoClient.close();
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runMigration().catch((err) => {
    console.error('❌ Migration process crashed:', err);
    process.exit(1);
  });
}

module.exports = runMigration;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Doctor', 'Nurse', 'Receptionist', 'Patient', 'Pharmacist', 'Staff');

-- CreateEnum
CREATE TYPE "SubRole" AS ENUM ('Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Ward Manager');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

-- CreateEnum
CREATE TYPE "MedicalStatus" AS ENUM ('Active', 'Resolved', 'Chronic');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('Consultation', 'Follow-up', 'Emergency', 'Surgery');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show');

-- CreateEnum
CREATE TYPE "AppointmentPriority" AS ENUM ('Normal', 'Urgent', 'Emergency');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('Consultation', 'Pharmacy', 'Test', 'Ward', 'Other');

-- CreateEnum
CREATE TYPE "BillingCategory" AS ENUM ('Consultation', 'Medicine', 'Lab Test', 'Imaging', 'Surgery', 'Room Charges', 'Emergency', 'Other');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Unpaid', 'Partially-Paid', 'Paid', 'Refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Online', 'Other', 'Cheque');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Partially-Approved');

-- CreateEnum
CREATE TYPE "MedicineCategory" AS ENUM ('Analgesic', 'Antibiotic', 'Anti-inflammatory', 'Antidiabetic', 'Antihypertensive', 'Antihistamine', 'Cardiovascular', 'Gastrointestinal', 'Respiratory', 'Neurological', 'Dermatological', 'Other');

-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Other');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('Pending', 'Partially-Filled', 'Fulfilled', 'Cancelled');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('Full-Time', 'Part-Time', 'Contract', 'Intern');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('Morning', 'Evening', 'Night', 'Rotational');

-- CreateEnum
CREATE TYPE "WardType" AS ENUM ('General', 'ICU', 'NICU', 'Private', 'Semi-Private', 'Emergency', 'Isolation');

-- CreateEnum
CREATE TYPE "WardGender" AS ENUM ('Male', 'Female', 'Mixed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Patient',
    "subRole" "SubRole",
    "phone" TEXT NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "avatar" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetPasswordToken" TEXT,
    "resetPasswordExpire" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "userId" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "consultationFee" DOUBLE PRECISION NOT NULL,
    "availability" JSONB,
    "onCallShifts" JSONB,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "userId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bloodGroup" "BloodGroup",
    "emergencyContact" JSONB,
    "allergies" TEXT[],
    "insuranceInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "diagnosedDate" TIMESTAMP(3) NOT NULL,
    "status" "MedicalStatus" NOT NULL,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentMedication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicine" TEXT,
    "dosage" TEXT,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "prescribedBy" TEXT,

    CONSTRAINT "CurrentMedication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testType" TEXT,
    "lab" TEXT,
    "testDate" TIMESTAMP(3),
    "reportDate" TIMESTAMP(3),
    "results" TEXT,
    "result" TEXT,
    "referenceRange" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "fileUrl" TEXT,
    "normalRange" TEXT,
    "remarks" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagingData" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT,
    "date" TIMESTAMP(3),
    "findings" TEXT,
    "fileUrl" TEXT,

    CONSTRAINT "ImagingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3),
    "dischargeDate" TIMESTAMP(3),
    "reason" TEXT,
    "ward" TEXT,
    "attendingDoctor" TEXT,

    CONSTRAINT "AdmissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'Scheduled',
    "priority" "AppointmentPriority" NOT NULL DEFAULT 'Normal',
    "symptoms" TEXT,
    "diagnosis" TEXT,
    "prescriptionId" TEXT,
    "notes" TEXT,
    "operationTheatre" JSONB,
    "cancelReason" TEXT,
    "consultationFee" DOUBLE PRECISION,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" "PaymentMethod",
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "billNumber" TEXT,
    "patientId" TEXT NOT NULL,
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billType" "BillType" NOT NULL DEFAULT 'Other',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'Unpaid',
    "paymentMethod" "PaymentMethod",
    "insuranceClaim" JSONB,
    "createdByRole" "Role",
    "generatedById" TEXT,
    "relatedAppointmentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingItem" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BillingCategory" NOT NULL DEFAULT 'Other',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BillingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPayment" (
    "id" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "notes" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "medicineId" TEXT,
    "name" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "category" "MedicineCategory" NOT NULL,
    "dosageForm" "DosageForm" NOT NULL DEFAULT 'Tablet',
    "strength" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 50,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "batchNumber" TEXT,
    "supplier" JSONB,
    "storageConditions" TEXT,
    "sideEffects" TEXT[],
    "contraindications" TEXT[],
    "prescriptionRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRestocked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "prescriptionId" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "diagnosis" TEXT,
    "symptoms" TEXT,
    "labTests" TEXT[],
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'Pending',
    "refillsAllowed" INTEGER NOT NULL DEFAULT 0,
    "refillsUsed" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionMedicine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "quantity" INTEGER NOT NULL,
    "dispensedQuantity" INTEGER NOT NULL DEFAULT 0,
    "dispensedById" TEXT,
    "dispensedAt" TIMESTAMP(3),

    CONSTRAINT "PrescriptionMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "qualification" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'Full-Time',
    "shift" "ShiftType" NOT NULL DEFAULT 'Morning',
    "workSchedule" JSONB,
    "salary" JSONB,
    "supervisorId" TEXT,
    "skills" TEXT[],
    "certifications" JSONB,
    "performance" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "legacyMongoId" TEXT,
    "wardNumber" TEXT NOT NULL,
    "wardName" TEXT NOT NULL,
    "wardType" "WardType" NOT NULL,
    "department" TEXT,
    "floor" INTEGER,
    "totalBeds" INTEGER NOT NULL,
    "availableBeds" INTEGER NOT NULL,
    "gender" "WardGender",
    "facilities" TEXT[],
    "dailyRate" DOUBLE PRECISION NOT NULL,
    "nurseInChargeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "patientId" TEXT,
    "admissionDate" TIMESTAMP(3),
    "expectedDischargeDate" TIMESTAMP(3),

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyMongoId_key" ON "User"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_legacyMongoId_idx" ON "User"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_legacyMongoId_key" ON "Doctor"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_licenseNumber_key" ON "Doctor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Doctor_licenseNumber_idx" ON "Doctor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Doctor_legacyMongoId_idx" ON "Doctor"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_legacyMongoId_key" ON "Patient"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");

-- CreateIndex
CREATE INDEX "Patient_patientId_idx" ON "Patient"("patientId");

-- CreateIndex
CREATE INDEX "Patient_userId_idx" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_legacyMongoId_idx" ON "Patient"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_legacyMongoId_key" ON "Appointment"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_appointmentId_key" ON "Appointment"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_prescriptionId_key" ON "Appointment"("prescriptionId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_appointmentDate_startTime_idx" ON "Appointment"("doctorId", "appointmentDate", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_patientId_appointmentDate_idx" ON "Appointment"("patientId", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_legacyMongoId_idx" ON "Appointment"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_legacyMongoId_key" ON "Billing"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_billNumber_key" ON "Billing"("billNumber");

-- CreateIndex
CREATE INDEX "Billing_billNumber_idx" ON "Billing"("billNumber");

-- CreateIndex
CREATE INDEX "Billing_patientId_idx" ON "Billing"("patientId");

-- CreateIndex
CREATE INDEX "Billing_billDate_idx" ON "Billing"("billDate");

-- CreateIndex
CREATE INDEX "Billing_paymentStatus_idx" ON "Billing"("paymentStatus");

-- CreateIndex
CREATE INDEX "Billing_billType_idx" ON "Billing"("billType");

-- CreateIndex
CREATE INDEX "Billing_legacyMongoId_idx" ON "Billing"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_legacyMongoId_key" ON "Medicine"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicine_medicineId_key" ON "Medicine"("medicineId");

-- CreateIndex
CREATE INDEX "Medicine_medicineId_idx" ON "Medicine"("medicineId");

-- CreateIndex
CREATE INDEX "Medicine_name_idx" ON "Medicine"("name");

-- CreateIndex
CREATE INDEX "Medicine_genericName_idx" ON "Medicine"("genericName");

-- CreateIndex
CREATE INDEX "Medicine_category_idx" ON "Medicine"("category");

-- CreateIndex
CREATE INDEX "Medicine_expiryDate_idx" ON "Medicine"("expiryDate");

-- CreateIndex
CREATE INDEX "Medicine_stockQuantity_idx" ON "Medicine"("stockQuantity");

-- CreateIndex
CREATE INDEX "Medicine_isActive_idx" ON "Medicine"("isActive");

-- CreateIndex
CREATE INDEX "Medicine_legacyMongoId_idx" ON "Medicine"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_legacyMongoId_key" ON "Prescription"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_prescriptionId_key" ON "Prescription"("prescriptionId");

-- CreateIndex
CREATE INDEX "Prescription_prescriptionId_idx" ON "Prescription"("prescriptionId");

-- CreateIndex
CREATE INDEX "Prescription_legacyMongoId_idx" ON "Prescription"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_legacyMongoId_key" ON "Staff"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_employeeId_key" ON "Staff"("employeeId");

-- CreateIndex
CREATE INDEX "Staff_employeeId_idx" ON "Staff"("employeeId");

-- CreateIndex
CREATE INDEX "Staff_legacyMongoId_idx" ON "Staff"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_legacyMongoId_key" ON "Ward"("legacyMongoId");

-- CreateIndex
CREATE UNIQUE INDEX "Ward_wardNumber_key" ON "Ward"("wardNumber");

-- CreateIndex
CREATE INDEX "Ward_wardNumber_idx" ON "Ward"("wardNumber");

-- CreateIndex
CREATE INDEX "Ward_legacyMongoId_idx" ON "Ward"("legacyMongoId");

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentMedication" ADD CONSTRAINT "CurrentMedication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagingData" ADD CONSTRAINT "ImagingData_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionHistory" ADD CONSTRAINT "AdmissionHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_relatedAppointmentId_fkey" FOREIGN KEY ("relatedAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPayment" ADD CONSTRAINT "BillingPayment_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_nurseInChargeId_fkey" FOREIGN KEY ("nurseInChargeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

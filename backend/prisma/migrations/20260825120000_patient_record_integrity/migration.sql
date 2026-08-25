ALTER TABLE "Patient"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "MedicalHistory"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "isVoided" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "voidReason" TEXT;

CREATE INDEX "MedicalHistory_patientId_isVoided_idx"
  ON "MedicalHistory"("patientId", "isVoided");

CREATE TABLE "ClinicalAuditEvent" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "actorId" TEXT,
  "recordType" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalAuditEvent_patientId_createdAt_idx"
  ON "ClinicalAuditEvent"("patientId", "createdAt");
CREATE INDEX "ClinicalAuditEvent_recordType_recordId_idx"
  ON "ClinicalAuditEvent"("recordType", "recordId");
ALTER TABLE "ClinicalAuditEvent"
  ADD CONSTRAINT "ClinicalAuditEvent_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

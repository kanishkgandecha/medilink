CREATE TABLE "ClinicalNote" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Draft',
  "source" TEXT NOT NULL,
  "sourceAgent" TEXT,
  "createdById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClinicalNoteVersion" (
  "id" TEXT NOT NULL,
  "clinicalNoteId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "amendmentNote" TEXT,
  "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "clinicallyConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClinicalNoteVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClinicalNote_patientId_createdAt_idx" ON "ClinicalNote"("patientId", "createdAt");
CREATE INDEX "ClinicalNote_status_reviewedAt_idx" ON "ClinicalNote"("status", "reviewedAt");
CREATE UNIQUE INDEX "ClinicalNoteVersion_clinicalNoteId_version_key" ON "ClinicalNoteVersion"("clinicalNoteId", "version");
CREATE INDEX "ClinicalNoteVersion_clinicalNoteId_createdAt_idx" ON "ClinicalNoteVersion"("clinicalNoteId", "createdAt");

ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalNoteVersion" ADD CONSTRAINT "ClinicalNoteVersion_clinicalNoteId_fkey" FOREIGN KEY ("clinicalNoteId") REFERENCES "ClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalNoteVersion" ADD CONSTRAINT "ClinicalNoteVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

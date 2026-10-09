-- Non-destructive: adds nullable attachment-metadata columns to an existing
-- table only. No columns dropped, no defaults changed, no data rewritten.
ALTER TABLE "LabReport" ADD COLUMN "attachmentStoredName" TEXT;
ALTER TABLE "LabReport" ADD COLUMN "attachmentOriginalName" TEXT;
ALTER TABLE "LabReport" ADD COLUMN "attachmentMimeType" TEXT;
ALTER TABLE "LabReport" ADD COLUMN "attachmentSize" INTEGER;
ALTER TABLE "LabReport" ADD COLUMN "attachmentUploadedAt" TIMESTAMP(3);
ALTER TABLE "LabReport" ADD COLUMN "attachmentUploadedById" TEXT;

ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_attachmentUploadedById_fkey" FOREIGN KEY ("attachmentUploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

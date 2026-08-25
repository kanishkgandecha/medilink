ALTER TABLE "Billing" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "Billing_sourceKey_key" ON "Billing"("sourceKey");

CREATE UNIQUE INDEX "Bed_wardId_bedNumber_key" ON "Bed"("wardId", "bedNumber");
CREATE INDEX "Bed_patientId_isOccupied_idx" ON "Bed"("patientId", "isOccupied");
CREATE UNIQUE INDEX "Bed_one_active_bed_per_patient_key"
  ON "Bed"("patientId")
  WHERE "isOccupied" = true AND "patientId" IS NOT NULL;

ALTER TABLE "Bed" ADD CONSTRAINT "Bed_occupancy_patient_consistency_check"
  CHECK (("isOccupied" = true AND "patientId" IS NOT NULL) OR ("isOccupied" = false AND "patientId" IS NULL));

ALTER TABLE "Ward" ADD CONSTRAINT "Ward_available_beds_range_check"
  CHECK ("availableBeds" >= 0 AND "availableBeds" <= "totalBeds");

ALTER TABLE "Appointment" ADD COLUMN "bookingKey" TEXT;
CREATE UNIQUE INDEX "Appointment_bookingKey_key" ON "Appointment"("bookingKey");

-- Legacy/demo data may contain more than one active appointment for a doctor slot.
-- Preserve the earliest record and retain the others as explicitly cancelled history
-- before enforcing the invariant. No appointment rows are deleted.
WITH ranked_active_slots AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY "doctorId", "appointmentDate", "startTime"
      ORDER BY "createdAt" ASC, id ASC
    ) AS slot_rank
  FROM "Appointment"
  WHERE "status" IN ('Scheduled', 'Confirmed', 'In-Progress')
)
UPDATE "Appointment" AS appointment
SET "status" = 'Cancelled',
    "cancelReason" = COALESCE(appointment."cancelReason", 'Cancelled during active-slot integrity migration: duplicate legacy booking'),
    "updatedAt" = CURRENT_TIMESTAMP
FROM ranked_active_slots
WHERE appointment.id = ranked_active_slots.id
  AND ranked_active_slots.slot_rank > 1;

CREATE UNIQUE INDEX "Appointment_active_doctor_slot_key"
  ON "Appointment"("doctorId", "appointmentDate", "startTime")
  WHERE "status" IN ('Scheduled', 'Confirmed', 'In-Progress');

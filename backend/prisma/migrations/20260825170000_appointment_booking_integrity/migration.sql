ALTER TABLE "Appointment" ADD COLUMN "bookingKey" TEXT;
CREATE UNIQUE INDEX "Appointment_bookingKey_key" ON "Appointment"("bookingKey");

CREATE UNIQUE INDEX "Appointment_active_doctor_slot_key"
  ON "Appointment"("doctorId", "appointmentDate", "startTime")
  WHERE "status" IN ('Scheduled', 'Confirmed', 'In-Progress');

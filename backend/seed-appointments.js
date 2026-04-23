require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

const TYPES = ['Consultation', 'Follow-up', 'Emergency', 'Surgery'];
const STATUSES = ['Scheduled', 'Confirmed', 'Completed', 'Completed', 'Completed', 'Cancelled'];
const SYMPTOMS = [
  'Fever and body ache', 'Persistent cough', 'Chest pain', 'Shortness of breath',
  'Abdominal pain', 'Headache and dizziness', 'Joint pain', 'Skin rash',
  'Fatigue and weakness', 'High blood pressure', 'Diabetes follow-up',
  'Back pain', 'Nausea and vomiting', 'Eye irritation', 'Ear pain',
];
const TIME_SLOTS = [
  { startTime: '09:00', endTime: '09:30' },
  { startTime: '09:30', endTime: '10:00' },
  { startTime: '10:00', endTime: '10:30' },
  { startTime: '10:30', endTime: '11:00' },
  { startTime: '11:00', endTime: '11:30' },
  { startTime: '11:30', endTime: '12:00' },
  { startTime: '14:00', endTime: '14:30' },
  { startTime: '14:30', endTime: '15:00' },
  { startTime: '15:00', endTime: '15:30' },
  { startTime: '15:30', endTime: '16:00' },
  { startTime: '16:00', endTime: '16:30' },
  { startTime: '16:30', endTime: '17:00' },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomDate = (daysBack, daysForward = 0) => {
  const now = Date.now();
  const from = now - daysBack * 86400000;
  const to = now + daysForward * 86400000;
  return new Date(from + Math.random() * (to - from));
};

async function seedAppointments() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const doctors = await Doctor.find().populate('userId', 'name');
  const patients = await Patient.find().populate('userId', 'name');

  if (doctors.length === 0) {
    console.error('No doctors found in DB. Run the main seed script first.');
    process.exit(1);
  }
  if (patients.length === 0) {
    console.error('No patients found in DB. Run the main seed script first.');
    process.exit(1);
  }

  console.log(`Found ${doctors.length} doctors, ${patients.length} patients`);

  const existing = await Appointment.countDocuments();
  console.log(`Existing appointments: ${existing}`);

  // Build appointments: ~3–5 per patient spread across past 90 days + next 30 days
  const toCreate = [];
  const usedSlots = new Set(); // prevent exact doctor+date+time collisions

  for (const patient of patients) {
    const count = 3 + Math.floor(Math.random() * 3); // 3–5 per patient
    for (let i = 0; i < count; i++) {
      const doctor = pick(doctors);
      const slot = pick(TIME_SLOTS);
      const apptDate = randomDate(90, 30);
      const dateKey = apptDate.toISOString().split('T')[0];
      const slotKey = `${doctor._id}:${dateKey}:${slot.startTime}`;

      if (usedSlots.has(slotKey)) continue;
      usedSlots.add(slotKey);

      // Past appointments get realistic statuses; future ones are Scheduled/Confirmed
      const isPast = apptDate < new Date();
      const status = isPast ? pick(STATUSES) : pick(['Scheduled', 'Confirmed']);
      const type = pick(TYPES);

      toCreate.push({
        patient: patient._id,
        doctor: doctor._id,
        appointmentDate: apptDate,
        timeSlot: slot,
        type,
        status,
        symptoms: pick(SYMPTOMS),
        consultationFee: 300 + Math.floor(Math.random() * 700),
        priority: Math.random() < 0.1 ? 'Urgent' : 'Normal',
      });
    }
  }

  if (toCreate.length === 0) {
    console.log('No new appointments to insert (all slots already taken).');
    await mongoose.disconnect();
    return;
  }

  // insertMany won't trigger pre-save hook for appointmentId — use create in batches
  let created = 0;
  for (const data of toCreate) {
    try {
      await Appointment.create(data);
      created++;
    } catch (err) {
      // skip duplicates silently
    }
  }

  console.log(`\nDone. Created ${created} appointments across ${patients.length} patients and ${doctors.length} doctors.`);
  await mongoose.disconnect();
}

seedAppointments().catch(err => {
  console.error(err);
  process.exit(1);
});

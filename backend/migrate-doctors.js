require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

const DOCTOR_PROFILES = [
  { email: 'keshav.iyer@medilink.com',  specialization: 'Cardiology',       qualification: 'MBBS, MD (Medicine), DM (Cardiology)',   experience: 18, licenseNumber: 'MCI-CARD-2006-001', department: 'Cardiology',       consultationFee: 1500 },
  { email: 'manik.verma@medilink.com',  specialization: 'Neurology',        qualification: 'MBBS, MD (Medicine), DM (Neurology)',    experience: 21, licenseNumber: 'MCI-NEURO-2003-002', department: 'Neurology',       consultationFee: 2000 },
  { email: 'priya.nair@medilink.com',   specialization: 'Pediatrics',       qualification: 'MBBS, MD (Pediatrics)',                  experience: 13, licenseNumber: 'MCI-PED-2011-003',  department: 'Pediatrics',      consultationFee: 800  },
  { email: 'rajan.patel@medilink.com',  specialization: 'Orthopedics',      qualification: 'MBBS, MS (Orthopedics)',                 experience: 25, licenseNumber: 'MCI-ORTHO-1999-004', department: 'Orthopedics',    consultationFee: 1200 },
  { email: 'ananya.bose@medilink.com',  specialization: 'Dermatology',      qualification: 'MBBS, MD (Dermatology)',                 experience: 10, licenseNumber: 'MCI-DERM-2014-005', department: 'Dermatology',     consultationFee: 1000 },
  { email: 'vikram.sharma@medilink.com',specialization: 'General Medicine', qualification: 'MBBS, MD (General Medicine)',            experience: 16, licenseNumber: 'MCI-GM-2008-006',  department: 'General Medicine', consultationFee: 600  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  let created = 0, skipped = 0;

  for (const profile of DOCTOR_PROFILES) {
    const user = await User.findOne({ email: profile.email });
    if (!user) { console.log(`  SKIP (no user): ${profile.email}`); skipped++; continue; }

    const existing = await Doctor.findOne({ userId: user._id });
    if (existing) { console.log(`  SKIP (profile exists): ${profile.email}`); skipped++; continue; }

    await Doctor.create({
      userId: user._id,
      specialization: profile.specialization,
      qualification: profile.qualification,
      experience: profile.experience,
      licenseNumber: profile.licenseNumber,
      department: profile.department,
      consultationFee: profile.consultationFee,
      isAvailable: true,
      availability: []
    });
    console.log(`  CREATED: ${user.name} — ${profile.specialization}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err.message); process.exit(1); });

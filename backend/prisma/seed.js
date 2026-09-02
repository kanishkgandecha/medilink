const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Deterministic PRNG for reproducible seeding
let seedValue = 12345;
const isRandom = process.env.SEED_RANDOM === 'true';

function pseudoRandom() {
  if (isRandom) return Math.random();
  const x = Math.sin(seedValue++) * 10000;
  return x - Math.floor(x);
}

function pickRandom(arr) {
  return arr[Math.floor(pseudoRandom() * arr.length)];
}

const INDIAN_FIRST_NAMES_MALE = [
  'Rahul', 'Arjun', 'Rohan', 'Vikram', 'Aditya', 'Suresh', 'Amit', 'Rajesh', 'Siddharth', 'Farhan',
  'Gaurav', 'Manish', 'Karan', 'Deepak', 'Nitin', 'Vijay', 'Alok', 'Tarun', 'Harish', 'Sanjay',
  'Anand', 'Pradeep', 'Devendra', 'Sunil', 'Ashok', 'Mahesh', 'Ramesh', 'Pankaj', 'Vikas', 'Dinesh'
];

const INDIAN_FIRST_NAMES_FEMALE = [
  'Priya', 'Ananya', 'Kavita', 'Meena', 'Fatima', 'Priyanka', 'Rohini', 'Smita', 'Preeti', 'Neha',
  'Sunita', 'Deepa', 'Anjali', 'Krutika', 'Swati', 'Pooja', 'Shweta', 'Divya', 'Ritu', 'Aarti',
  'Nisha', 'Rashmi', 'Kiran', 'Sangeeta', 'Lata', 'Vandana', 'Bhavna', 'Reena', 'Manju', 'Geeta'
];

const INDIAN_LAST_NAMES = [
  'Sharma', 'Gupta', 'Mehta', 'Deshmukh', 'Iyer', 'Nair', 'Patel', 'Joshi', 'Chandra', 'Sundaram',
  'Bhatia', 'Qureshi', 'Rao', 'Das', 'Kulkarni', 'Sengupta', 'Bannerjee', 'Nambiar', 'Agrawal', 'Rane',
  'Tripathi', 'Pillai', 'Verma', 'Swaminathan', 'Reddy', 'Kapoor', 'Singh', 'Sen', 'Trivedi', 'Saxena'
];

const CITIES_STATES = [
  { city: 'Mumbai', state: 'Maharashtra', zipCode: '400001' },
  { city: 'Delhi', state: 'Delhi NCR', zipCode: '110001' },
  { city: 'Bengaluru', state: 'Karnataka', zipCode: '560001' },
  { city: 'Hyderabad', state: 'Telangana', zipCode: '500001' },
  { city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001' },
  { city: 'Pune', state: 'Maharashtra', zipCode: '411001' },
  { city: 'Kolkata', state: 'West Bengal', zipCode: '700001' },
  { city: 'Ahmedabad', state: 'Gujarat', zipCode: '380001' },
  { city: 'Jaipur', state: 'Rajasthan', zipCode: '302001' },
  { city: 'Lucknow', state: 'Uttar Pradesh', zipCode: '226001' }
];

const BLOOD_GROUPS = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE'];

async function cleanDatabase() {
  console.log('🧹 Cleaning existing PostgreSQL application data...');
  await prisma.billingPayment.deleteMany();
  await prisma.billingItem.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.admissionHistory.deleteMany();
  await prisma.imagingData.deleteMany();
  await prisma.labReport.deleteMany();
  await prisma.currentMedication.deleteMany();
  await prisma.medicalHistory.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Clean complete.');
}

async function seed() {
  const startTime = Date.now();
  console.log('🌱 Starting Deterministic Indian Multi-Specialty Hospital Seed...');

  await cleanDatabase();

  const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Single Primary System Administrator
  console.log('  ├─ Creating Administrator (admin@medilink.com)...');
  await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@medilink.com',
      password: passwordHash,
      role: 'Admin',
      phone: '9876543210',
      street: 'Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400020',
      country: 'India',
    },
  });

  // 2. Doctors (20 Specialists - primary demo login: doctor@medilink.com)
  console.log('  ├─ Creating 20 Specialist Doctors (primary: doctor@medilink.com)...');
  const doctorDefs = [
    { name: 'Dr. Vikramaditya Mehta', email: 'doctor@medilink.com', spec: 'Cardiology', qual: 'MD, DM Cardiology', exp: 16, dept: 'Cardiology', fee: 1500, phone: '9820111001' },
    { name: 'Dr. Ananya Deshmukh', email: 'ananya.deshmukh@medilink.in', spec: 'Neurology', qual: 'MD, DNB Neurology', exp: 14, dept: 'Neurology', fee: 1400, phone: '9820111002' },
    { name: 'Dr. Suresh Iyer', email: 'suresh.iyer@medilink.in', spec: 'Orthopaedics', qual: 'MS Ortho, Joint Specialist', exp: 18, dept: 'Orthopaedics', fee: 1200, phone: '9820111003' },
    { name: 'Dr. Priya Nair', email: 'priya.nair@medilink.in', spec: 'Paediatrics', qual: 'MD Paediatrics', exp: 10, dept: 'Paediatrics', fee: 1000, phone: '9820111004' },
    { name: 'Dr. Arunkumar Patel', email: 'arun.patel@medilink.in', spec: 'General Physician', qual: 'MD Internal Medicine', exp: 12, dept: 'General Medicine', fee: 800, phone: '9820111005' },
    { name: 'Dr. Deepali Joshi', email: 'deepali.joshi@medilink.in', spec: 'Gastroenterology', qual: 'MD, DM Gastroenterology', exp: 15, dept: 'Gastroenterology', fee: 1300, phone: '9820111006' },
    { name: 'Dr. Rajesh Chandra', email: 'rajesh.chandra@medilink.in', spec: 'Dermatology', qual: 'MD Dermatology', exp: 11, dept: 'Dermatology', fee: 900, phone: '9820111007' },
    { name: 'Dr. Kavitha Sundaram', email: 'kavitha.sundaram@medilink.in', spec: 'Oncology', qual: 'MD, DM Medical Oncology', exp: 17, dept: 'Oncology', fee: 1800, phone: '9820111008' },
    { name: 'Dr. Manoj Bhatia', email: 'manoj.bhatia@medilink.in', spec: 'ENT Specialist', qual: 'MS ENT', exp: 13, dept: 'ENT', fee: 850, phone: '9820111009' },
    { name: 'Dr. Farhan Qureshi', email: 'farhan.qureshi@medilink.in', spec: 'Nephrology', qual: 'MD, DM Nephrology', exp: 15, dept: 'Nephrology', fee: 1400, phone: '9820111010' },
    { name: 'Dr. Sunita Rao', email: 'sunita.rao@medilink.in', spec: 'Pulmonology', qual: 'MD Respiratory Medicine', exp: 11, dept: 'Pulmonology', fee: 1100, phone: '9820111011' },
    { name: 'Dr. Amitava Das', email: 'amitava.das@medilink.in', spec: 'Urology', qual: 'MCh Urology', exp: 19, dept: 'Urology', fee: 1500, phone: '9820111012' },
    { name: 'Dr. Rohini Kulkarni', email: 'rohini.kulkarni@medilink.in', spec: 'Gynecology', qual: 'MS Obstetrics & Gynecology', exp: 14, dept: 'Gynecology', fee: 1200, phone: '9820111013' },
    { name: 'Dr. Tarun Sengupta', email: 'tarun.sengupta@medilink.in', spec: 'Ophthalmology', qual: 'MS Ophthalmology', exp: 12, dept: 'Ophthalmology', fee: 950, phone: '9820111014' },
    { name: 'Dr. Smita Bannerjee', email: 'smita.bannerjee@medilink.in', spec: 'Psychiatry', qual: 'MD Psychiatry', exp: 10, dept: 'Psychiatry', fee: 1200, phone: '9820111015' },
    { name: 'Dr. Harish Nambiar', email: 'harish.nambiar@medilink.in', spec: 'Rheumatology', qual: 'MD, DM Rheumatology', exp: 16, dept: 'Rheumatology', fee: 1350, phone: '9820111016' },
    { name: 'Dr. Preeti Agrawal', email: 'preeti.agrawal@medilink.in', spec: 'Endocrinology', qual: 'MD, DM Endocrinology', exp: 13, dept: 'Endocrinology', fee: 1400, phone: '9820111017' },
    { name: 'Dr. Vivek Rane', email: 'vivek.rane@medilink.in', spec: 'Anesthesiology', qual: 'MD Anesthesiology', exp: 15, dept: 'Anesthesiology', fee: 1000, phone: '9820111018' },
    { name: 'Dr. Neha Tripathi', email: 'neha.tripathi@medilink.in', spec: 'Pathology', qual: 'MD Pathology', exp: 12, dept: 'Pathology', fee: 800, phone: '9820111019' },
    { name: 'Dr. Siddharth Pillai', email: 'siddharth.pillai@medilink.in', spec: 'Radiology', qual: 'MD Radio-Diagnosis', exp: 14, dept: 'Radiology', fee: 1100, phone: '9820111020' },
  ];

  const doctors = [];
  for (let i = 0; i < doctorDefs.length; i++) {
    const d = doctorDefs[i];
    const cityObj = CITIES_STATES[i % CITIES_STATES.length];
    const u = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        password: passwordHash,
        role: 'Doctor',
        phone: d.phone,
        city: cityObj.city,
        state: cityObj.state,
        country: 'India',
        gender: i % 2 === 0 ? 'Male' : 'Female',
      },
    });

    const doc = await prisma.doctor.create({
      data: {
        userId: u.id,
        specialization: d.spec,
        qualification: d.qual,
        experience: d.exp,
        licenseNumber: `MCI-LIC-${String(1000 + i)}`,
        department: d.dept,
        consultationFee: d.fee,
        rating: Number((4.5 + (i % 5) * 0.1).toFixed(1)),
        totalRatings: 30 + i * 5,
        isAvailable: true,
        availability: [
          { day: 'Monday', slots: [{ startTime: '09:00', endTime: '13:00', isAvailable: true }, { startTime: '14:00', endTime: '17:00', isAvailable: true }] },
          { day: 'Wednesday', slots: [{ startTime: '09:00', endTime: '13:00', isAvailable: true }, { startTime: '14:00', endTime: '17:00', isAvailable: true }] },
          { day: 'Friday', slots: [{ startTime: '09:00', endTime: '13:00', isAvailable: true }] }
        ]
      },
    });
    doctors.push(doc);
  }

  // 3. Hospital Staff with Canonical Generalized Seed Accounts
  console.log('  ├─ Creating Hospital Staff with Canonical Generalized Logins...');
  const canonicalStaff = [
    { email: 'nurse@medilink.com', name: 'Sister Deepa Pillai', role: 'Staff', subRole: 'Nurse', designation: 'Head ICU Nurse', dept: 'ICU', phone: '9820710001' },
    { email: 'receptionist@medilink.com', name: 'Sunita Verma', role: 'Staff', subRole: 'Receptionist', designation: 'Front Desk Lead', dept: 'Reception', phone: '9820710002' },
    { email: 'pharmacist@medilink.com', name: 'Amit Joshi', role: 'Staff', subRole: 'Pharmacist', designation: 'Chief Pharmacist', dept: 'Pharmacy', phone: '9820710003' },
    { email: 'labtech@medilink.com', name: 'Ramesh Kulkarni', role: 'Staff', subRole: 'LabTechnician', designation: 'Lead Pathology Tech', dept: 'Pathology', phone: '9820710004' },
    { email: 'radiology@medilink.com', name: 'Anil Saxena', role: 'Staff', subRole: 'RadiologyTechnician', designation: 'Lead Radiology Tech', dept: 'Radiology', phone: '9820710005' },
    { email: 'billing@medilink.com', name: 'Vijay Trivedi', role: 'Staff', subRole: 'BillingStaff', designation: 'Billing Manager', dept: 'Finance', phone: '9820710006' },
  ];

  const staffList = [];
  for (const cs of canonicalStaff) {
    const u = await prisma.user.create({
      data: {
        name: cs.name,
        email: cs.email,
        password: passwordHash,
        role: cs.role,
        subRole: cs.subRole,
        phone: cs.phone,
        gender: 'Female',
        city: 'Mumbai',
        country: 'India',
      },
    });

    const s = await prisma.staff.create({
      data: {
        userId: u.id,
        employeeId: `EMP-${cs.email.split('@')[0].toUpperCase()}`,
        designation: cs.designation,
        department: cs.dept,
        joiningDate: new Date(2022, 0, 1),
        employmentType: 'Full_Time',
        shift: 'Morning',
        salary: { basic: 35000, allowances: 8000, total: 43000 },
      },
    });
    staffList.push(s);
  }

  // Additional generic staff members
  const staffRoleMap = [
    { role: 'Staff', subRole: 'Nurse', designation: 'General Ward Nurse', dept: 'General Medicine' },
    { role: 'Staff', subRole: 'Pharmacist', designation: 'Assistant Pharmacist', dept: 'Pharmacy' },
    { role: 'Staff', subRole: 'LabTechnician', designation: 'Lab Technician', dept: 'Pathology' },
    { role: 'Staff', subRole: 'Receptionist', designation: 'Reception Desk Assistant', dept: 'Reception' },
    { role: 'Staff', subRole: 'WardManager', designation: 'Ward In-Charge', dept: 'Nursing' },
  ];

  for (let i = 0; i < 64; i++) {
    const isMale = i % 2 === 0;
    const fName = isMale ? pickRandom(INDIAN_FIRST_NAMES_MALE) : pickRandom(INDIAN_FIRST_NAMES_FEMALE);
    const lName = pickRandom(INDIAN_LAST_NAMES);
    const name = `${fName} ${lName}`;
    const roleDef = staffRoleMap[i % staffRoleMap.length];
    const email = `staff.${i + 1}@medilink.in`;
    const phone = `98207${String(20000 + i).slice(-5)}`;

    const u = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: roleDef.role,
        subRole: roleDef.subRole,
        phone,
        gender: isMale ? 'Male' : 'Female',
        city: 'Mumbai',
        country: 'India',
      },
    });

    const s = await prisma.staff.create({
      data: {
        userId: u.id,
        employeeId: `EMP-${String(100 + i)}`,
        designation: roleDef.designation,
        department: roleDef.dept,
        joiningDate: new Date(2022, i % 12, (i % 28) + 1),
        employmentType: 'Full_Time',
        shift: i % 3 === 0 ? 'Morning' : i % 3 === 1 ? 'Evening' : 'Night',
        salary: { basic: 25000 + i * 500, allowances: 5000, total: 30000 + i * 500 },
      },
    });
    staffList.push(s);
  }

  // 4. Medicines (15 Popular Indian Brands & Generics)
  console.log('  ├─ Creating Medicine Inventory (15 Indian Brands)...');
  const medicineDefs = [
    { id: 'MED-TELMA-40', name: 'Telma 40mg', generic: 'Telmisartan', mfr: 'Glenmark Pharmaceuticals', cat: 'Cardiovascular', form: 'Tablet', price: 12.5, stock: 800, reorder: 100 },
    { id: 'MED-PAN-40', name: 'Pan-40', generic: 'Pantoprazole', mfr: 'Alkem Laboratories', cat: 'Gastrointestinal', form: 'Tablet', price: 9.0, stock: 1200, reorder: 150 },
    { id: 'MED-DOLO-650', name: 'Dolo 650mg', generic: 'Paracetamol', mfr: 'Micro Labs Ltd', cat: 'Analgesic', form: 'Tablet', price: 3.5, stock: 2500, reorder: 300 },
    { id: 'MED-AUG-625', name: 'Augmentin 625mg', generic: 'Amoxicillin + Clavulanate', mfr: 'GSK India', cat: 'Antibiotic', form: 'Tablet', price: 24.0, stock: 450, reorder: 80 },
    { id: 'MED-GLY-GP2', name: 'Glycomet GP2', generic: 'Metformin + Glimepiride', mfr: 'USV Private Ltd', cat: 'Antidiabetic', form: 'Tablet', price: 14.0, stock: 950, reorder: 120 },
    { id: 'MED-ECO-75', name: 'Ecosprin 75mg', generic: 'Aspirin', mfr: 'USV Private Ltd', cat: 'Cardiovascular', form: 'Tablet', price: 1.5, stock: 3000, reorder: 400 },
    { id: 'MED-MON-LC', name: 'Montair LC', generic: 'Montelukast + Levocetirizine', mfr: 'Cipla Ltd', cat: 'Respiratory', form: 'Tablet', price: 18.0, stock: 600, reorder: 100 },
    { id: 'MED-MET-25', name: 'Met XL 25mg', generic: 'Metoprolol Succinate', mfr: 'Ajanta Pharma', cat: 'Cardiovascular', form: 'Tablet', price: 11.0, stock: 700, reorder: 100 },
    { id: 'MED-CIP-500', name: 'Ciplox 500mg', generic: 'Ciprofloxacin', mfr: 'Cipla Ltd', cat: 'Antibiotic', form: 'Tablet', price: 8.5, stock: 850, reorder: 100 },
    { id: 'MED-SHE-500', name: 'Shelcal 500mg', generic: 'Calcium + Vitamin D3', mfr: 'Torrent Pharmaceuticals', cat: 'Other', form: 'Tablet', price: 10.0, stock: 1500, reorder: 200 },
    { id: 'MED-AZI-500', name: 'Azithral 500mg', generic: 'Azithromycin', mfr: 'Alembic Pharmaceuticals', cat: 'Antibiotic', form: 'Tablet', price: 22.0, stock: 400, reorder: 60 },
    { id: 'MED-THY-50', name: 'Thyronorm 50mcg', generic: 'Thyroxine Sodium', mfr: 'Abbott India', cat: 'Other', form: 'Tablet', price: 4.0, stock: 1100, reorder: 150 },
    { id: 'MED-ATO-10', name: 'Atorva 10mg', generic: 'Atorvastatin', mfr: 'Zydus Cadila', cat: 'Cardiovascular', form: 'Tablet', price: 13.0, stock: 900, reorder: 120 },
    { id: 'MED-ULT-T', name: 'Ultracet', generic: 'Tramadol + Paracetamol', mfr: 'Janssen India', cat: 'Analgesic', form: 'Tablet', price: 28.0, stock: 350, reorder: 50 },
    { id: 'MED-OND-4', name: 'Ondem 4mg', generic: 'Ondansetron', mfr: 'Alkem Laboratories', cat: 'Gastrointestinal', form: 'Tablet', price: 6.0, stock: 1000, reorder: 150 }
  ];

  const medicines = [];
  for (const mDef of medicineDefs) {
    const med = await prisma.medicine.create({
      data: {
        medicineId: mDef.id,
        name: mDef.name,
        genericName: mDef.generic,
        manufacturer: mDef.mfr,
        category: mDef.cat,
        dosageForm: mDef.form,
        unitPrice: mDef.price,
        stockQuantity: mDef.stock,
        reorderLevel: mDef.reorder,
        expiryDate: new Date(2027, 11, 31),
      },
    });
    medicines.push(med);
  }

  // 5. Wards & Beds (7 Wards, 35 Beds)
  console.log('  ├─ Creating Wards & Beds (7 Wards, 35 Beds)...');
  const wardDefs = [
    { num: 'ICU-101', name: 'Cardiac ICU', type: 'ICU', dept: 'Cardiology', floor: 1, rate: 5000 },
    { num: 'EMG-102', name: 'Emergency Trauma Care', type: 'Emergency', dept: 'Emergency', floor: 1, rate: 4500 },
    { num: 'PED-201', name: 'Paediatric Suite', type: 'General', dept: 'Paediatrics', floor: 2, rate: 2500 },
    { num: 'GEN-301', name: 'General Male Ward', type: 'General', dept: 'General Medicine', floor: 3, rate: 1000 },
    { num: 'GEN-302', name: 'General Female Ward', type: 'General', dept: 'General Medicine', floor: 3, rate: 1000 },
    { num: 'MAT-401', name: 'Maternity Ward', type: 'General', dept: 'Gynecology', floor: 4, rate: 2000 },
    { num: 'PVT-501', name: 'Private Deluxe Suite', type: 'Private', dept: 'General Medicine', floor: 5, rate: 7500 },
  ];

  const wards = [];
  for (const wDef of wardDefs) {
    const w = await prisma.ward.create({
      data: {
        wardNumber: wDef.num,
        wardName: wDef.name,
        wardType: wDef.type,
        department: wDef.dept,
        floor: wDef.floor,
        totalBeds: 5,
        availableBeds: 5,
        facilities: ['Oxygen Supply', 'Monitor', 'Nurse Call Button'],
        dailyRate: wDef.rate,
        beds: {
          create: Array.from({ length: 5 }).map((_, idx) => ({
            bedNumber: `${wDef.num}-B${idx + 1}`,
            isOccupied: false,
          })),
        },
      },
      include: { beds: true },
    });
    wards.push(w);
  }

  // 6. Patients (150 Fictional Indian Patients - primary: patient@medilink.com)
  console.log('  ├─ Creating 150 Fictional Indian Patients (primary: patient@medilink.com)...');
  const patientDefs = [
    { name: 'Rahul Gupta', email: 'patient@medilink.com', phone: '9819011223', gender: 'Male', bg: 'B_POSITIVE', city: 'Mumbai' },
    { name: 'Meena Swaminathan', email: 'meena.s@gmail.com', phone: '9845022334', gender: 'Female', bg: 'O_POSITIVE', city: 'Bengaluru' },
    { name: 'Kavita Reddy', email: 'kavita.reddy@gmail.com', phone: '9849033445', gender: 'Female', bg: 'A_POSITIVE', city: 'Hyderabad' },
    { name: 'Arjun Kapoor', email: 'arjun.kapoor@gmail.com', phone: '9811044556', gender: 'Male', bg: 'AB_POSITIVE', city: 'Delhi' },
  ];

  const patients = [];
  for (let i = 0; i < 150; i++) {
    let pName, pEmail, pPhone, pGender, pBg, pCityObj;

    if (i < patientDefs.length) {
      const def = patientDefs[i];
      pName = def.name;
      pEmail = def.email;
      pPhone = def.phone;
      pGender = def.gender;
      pBg = def.bg;
      pCityObj = CITIES_STATES.find((c) => c.city === def.city) || CITIES_STATES[0];
    } else {
      const isMale = i % 2 === 0;
      const fName = isMale ? pickRandom(INDIAN_FIRST_NAMES_MALE) : pickRandom(INDIAN_FIRST_NAMES_FEMALE);
      const lName = pickRandom(INDIAN_LAST_NAMES);
      pName = `${fName} ${lName}`;
      pEmail = `patient.${i + 1}@fictionalmed.in`;
      pPhone = `98${String(10000000 + i).slice(-8)}`;
      pGender = isMale ? 'Male' : 'Female';
      pBg = pickRandom(BLOOD_GROUPS);
      pCityObj = pickRandom(CITIES_STATES);
    }

    const u = await prisma.user.create({
      data: {
        name: pName,
        email: pEmail,
        password: passwordHash,
        role: 'Patient',
        phone: pPhone,
        gender: pGender,
        street: 'MG Road',
        city: pCityObj.city,
        state: pCityObj.state,
        zipCode: pCityObj.zipCode,
        country: 'India',
        dateOfBirth: new Date(1965 + (i % 40), i % 12, (i % 28) + 1),
      },
    });

    const pat = await prisma.patient.create({
      data: {
        userId: u.id,
        patientId: `PT-IND-${String(1000 + i)}`,
        bloodGroup: pBg,
        emergencyContact: { name: `Kin of ${pName}`, relation: 'Relative', phone: pPhone },
        allergies: i % 4 === 0 ? ['Penicillin'] : i % 7 === 0 ? ['Sulfa Drugs'] : [],
        medicalHistory: {
          create: i % 3 === 0 ? [{ condition: 'Essential Hypertension', diagnosedDate: new Date('2021-03-15'), status: 'Active', notes: 'Managed with Telma 40mg' }] : [],
        },
      },
    });
    patients.push(pat);
  }

  // 7. Clinical Data: Appointments (250+ Appointments)
  console.log('  ├─ Creating 250+ Appointments...');
  const apptStatuses = ['Completed', 'Completed', 'Completed', 'Scheduled', 'Cancelled', 'In_Progress'];
  const apptTypes = ['Consultation', 'Follow_up', 'Emergency', 'Surgery'];

  const appointments = [];
  const today = new Date();

  for (let i = 0; i < 250; i++) {
    const doc = doctors[i % doctors.length];
    const pat = patients[i % patients.length];
    const daysOffset = (i % 40) - 25; // 25 days past to 15 days future
    const apptDate = new Date(today);
    apptDate.setDate(today.getDate() + daysOffset);

    const status = daysOffset < 0 ? (i % 10 === 0 ? 'Cancelled' : 'Completed') : apptStatuses[i % apptStatuses.length];
    const hour = 9 + (i % 8);
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    const endTime = `${String(hour).padStart(2, '0')}:30`;

    const appt = await prisma.appointment.create({
      data: {
        appointmentId: `APT-2026-${String(10000 + i)}`,
        patientId: pat.id,
        doctorId: doc.id,
        appointmentDate: apptDate,
        startTime,
        endTime,
        type: apptTypes[i % apptTypes.length],
        status,
        priority: i % 15 === 0 ? 'Emergency' : i % 5 === 0 ? 'Urgent' : 'Normal',
        symptoms: i % 2 === 0 ? 'Fever, cough and fatigue' : 'Hypertension check and mild headache',
        diagnosis: status === 'Completed' ? 'Acute Upper Respiratory Tract Infection' : null,
        consultationFee: doc.consultationFee,
        paid: status === 'Completed',
        paymentMethod: status === 'Completed' ? (i % 2 === 0 ? 'UPI' : 'Card') : null,
      },
    });
    appointments.push(appt);
  }

  // 8. Prescriptions & Line Items (150 Prescriptions)
  console.log('  ├─ Creating 150 Prescriptions...');
  for (let i = 0; i < 150; i++) {
    const appt = appointments[i];
    const med1 = medicines[i % medicines.length];
    const med2 = medicines[(i + 1) % medicines.length];

    await prisma.prescription.create({
      data: {
        prescriptionId: `RX-2026-${String(10000 + i)}`,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        diagnosis: appt.diagnosis || 'Routine Management',
        symptoms: appt.symptoms,
        status: i % 3 === 0 ? 'Fulfilled' : i % 3 === 1 ? 'Partially_Filled' : 'Pending',
        refillsAllowed: 2,
        validUntil: new Date(2026, 11, 31),
        medicines: {
          create: [
            { medicineId: med1.id, dosage: '1 tablet', frequency: 'Once daily after breakfast', duration: '10 days', quantity: 10, dispensedQuantity: 10 },
            { medicineId: med2.id, dosage: '1 tablet', frequency: 'Twice daily after meals', duration: '5 days', quantity: 10, dispensedQuantity: 5 },
          ],
        },
      },
    });
  }

  // 9. Billing & Payments (150 Bills)
  console.log('  ├─ Creating 150 Billing Records & Insurance Claims...');
  for (let i = 0; i < 150; i++) {
    const pat = patients[i % patients.length];
    const fee = 1000 + (i % 5) * 500;
    const isPaid = i % 2 === 0;
    const paymentStatus = isPaid ? 'Paid' : i % 3 === 0 ? 'Partially_Paid' : 'Unpaid';
    const amountPaid = isPaid ? fee : paymentStatus === 'Partially_Paid' ? fee / 2 : 0;
    const balance = fee - amountPaid;

    await prisma.billing.create({
      data: {
        billNumber: `BILL-2026-${String(10000 + i)}`,
        patientId: pat.id,
        billDate: new Date(2026, 0, (i % 28) + 1),
        billType: i % 3 === 0 ? 'Consultation' : i % 3 === 1 ? 'Pharmacy' : 'Ward',
        subtotal: fee,
        discount: 0,
        tax: 0,
        totalAmount: fee,
        amountPaid,
        balance,
        paymentStatus,
        paymentMethod: isPaid ? (i % 2 === 0 ? 'UPI' : 'Cash') : null,
        insuranceClaim: i % 5 === 0 ? { claimNumber: `CLM-INS-${i}`, provider: 'Star Health Insurance', amountClaimed: fee, status: 'Approved' } : null,
        items: {
          create: [
            { description: 'Specialist Consultation Fee', category: 'Consultation', quantity: 1, unitPrice: fee, amount: fee }
          ]
        },
        payments: isPaid ? {
          create: [{ amount: amountPaid, paymentMethod: 'UPI', transactionId: `TXN${Date.now()}${i}`, paymentDate: new Date() }]
        } : undefined
      },
    });
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n===========================================================');
  console.log(`🎉 DEMO SEED COMPLETED IN ${durationSec}s!`);
  console.log('===========================================================');
  console.log('  🔑 CANONICAL DEMO LOGINS (Password: Password123!)');
  console.log('  └─ Admin         : admin@medilink.com');
  console.log('  └─ Doctor        : doctor@medilink.com');
  console.log('  └─ Patient       : patient@medilink.com');
  console.log('  └─ Nurse         : nurse@medilink.com');
  console.log('  └─ Receptionist  : receptionist@medilink.com');
  console.log('  └─ Pharmacist    : pharmacist@medilink.com');
  console.log('  └─ Lab Tech      : labtech@medilink.com');
  console.log('  └─ Radiology Tech: radiology@medilink.com');
  console.log('  └─ Billing Staff : billing@medilink.com');
  console.log('===========================================================\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

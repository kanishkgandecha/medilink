require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Staff = require('./models/Staff');
const Ward = require('./models/Ward');
const Medicine = require('./models/Medicine');
const Appointment = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Billing = require('./models/Billing');

const shouldReset = process.argv.includes('--reset');

async function clearCollections() {
  console.log('Clearing all collections...');
  await Billing.deleteMany({});
  await Prescription.deleteMany({});
  await Appointment.deleteMany({});
  await Medicine.deleteMany({});
  await Ward.deleteMany({});
  await Staff.deleteMany({});
  await Patient.deleteMany({});
  await Doctor.deleteMany({});
  await User.deleteMany({});
  console.log('All collections cleared.\n');
}

async function seedAdmins() {
  console.log('Seeding admin users...');

  const adminData = [
    {
      name: 'Kanan Mehta',
      email: 'kanan.admin@medilink.com',
      password: 'Admin@123',
      role: 'Admin',
      phone: '9876543201',
      address: { street: '12 Shivaji Nagar', city: 'Pune', state: 'Maharashtra', zipCode: '411005', country: 'India' },
      dateOfBirth: new Date('1982-06-15'),
      gender: 'Female'
    },
    {
      name: 'Kanishk Sharma',
      email: 'kanishk.admin@medilink.com',
      password: 'Admin@123',
      role: 'Admin',
      phone: '9876543202',
      address: { street: '45 Connaught Place', city: 'New Delhi', state: 'Delhi', zipCode: '110001', country: 'India' },
      dateOfBirth: new Date('1985-03-22'),
      gender: 'Male'
    },
    {
      name: 'Tulika Agarwal',
      email: 'tulika.admin@medilink.com',
      password: 'Admin@123',
      role: 'Admin',
      phone: '9876543203',
      address: { street: '78 Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', zipCode: '226001', country: 'India' },
      dateOfBirth: new Date('1988-11-08'),
      gender: 'Female'
    }
  ];

  const admins = [];
  for (const data of adminData) {
    const admin = await User.create(data);
    admins.push(admin);
    console.log(`  Created admin: ${admin.name} (${admin.email})`);
  }

  console.log(`Admin seeding complete. Created ${admins.length} admins.\n`);
  return admins;
}

async function seedDoctors() {
  console.log('Seeding doctor users and profiles...');

  const doctorUserData = [
    {
      name: 'Dr. Keshav Iyer',
      email: 'keshav.iyer@medilink.com',
      password: 'Doctor@123',
      role: 'Doctor',
      phone: '9876543210',
      address: { street: '23 Banjara Hills', city: 'Hyderabad', state: 'Telangana', zipCode: '500034', country: 'India' },
      dateOfBirth: new Date('1975-04-12'),
      gender: 'Male'
    },
    {
      name: 'Dr. Manik Verma',
      email: 'manik.verma@medilink.com',
      password: 'Doctor@123',
      role: 'Doctor',
      phone: '9876543211',
      address: { street: '56 Juhu Scheme', city: 'Mumbai', state: 'Maharashtra', zipCode: '400049', country: 'India' },
      dateOfBirth: new Date('1972-09-27'),
      gender: 'Male'
    },
    {
      name: 'Dr. Priya Nair',
      email: 'priya.nair@medilink.com',
      password: 'Doctor@123',
      role: 'Doctor',
      phone: '9876543212',
      address: { street: '14 Vyttila Junction', city: 'Kochi', state: 'Kerala', zipCode: '682019', country: 'India' },
      dateOfBirth: new Date('1980-07-03'),
      gender: 'Female'
    },
    {
      name: 'Dr. Rajan Patel',
      email: 'rajan.patel@medilink.com',
      password: 'Doctor@123',
      role: 'Doctor',
      phone: '9876543213',
      address: { street: '9 CG Road', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380006', country: 'India' },
      dateOfBirth: new Date('1968-01-18'),
      gender: 'Male'
    },
    {
      name: 'Dr. Ananya Bose',
      email: 'ananya.bose@medilink.com',
      password: 'Doctor@123',
      role: 'Doctor',
      phone: '9876543214',
      address: { street: '31 Park Street', city: 'Kolkata', state: 'West Bengal', zipCode: '700016', country: 'India' },
      dateOfBirth: new Date('1983-05-21'),
      gender: 'Female'
    },
    {
      name: 'Dr. Vikram Sharma',
      email: 'vikram.sharma@medilink.com',
      password: 'Doctor@123',
      role: 'Doctor',
      phone: '9876543215',
      address: { street: '67 Malviya Nagar', city: 'Jaipur', state: 'Rajasthan', zipCode: '302017', country: 'India' },
      dateOfBirth: new Date('1977-12-09'),
      gender: 'Male'
    }
  ];

  const doctorUsers = [];
  for (const data of doctorUserData) {
    const user = await User.create(data);
    doctorUsers.push(user);
    console.log(`  Created doctor user: ${user.name} (${user.email})`);
  }

  const doctorProfileData = [
    {
      userId: doctorUsers[0]._id,
      specialization: 'Cardiology',
      qualification: 'MBBS, MD (Medicine), DM (Cardiology)',
      experience: 18,
      licenseNumber: 'MCI-CARD-2006-001',
      department: 'Cardiology',
      consultationFee: 1500,
      availability: [
        {
          day: 'Monday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '10:30', endTime: '11:00', isAvailable: true },
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '14:00', endTime: '14:30', isAvailable: true },
            { startTime: '14:30', endTime: '15:00', isAvailable: true }
          ]
        },
        {
          day: 'Wednesday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '14:00', endTime: '14:30', isAvailable: true },
            { startTime: '14:30', endTime: '15:00', isAvailable: true }
          ]
        },
        {
          day: 'Friday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '14:00', endTime: '14:30', isAvailable: true }
          ]
        }
      ],
      rating: 4.8,
      totalRatings: 215,
      isAvailable: true
    },
    {
      userId: doctorUsers[1]._id,
      specialization: 'Neurology',
      qualification: 'MBBS, MD (Medicine), DM (Neurology)',
      experience: 21,
      licenseNumber: 'MCI-NEURO-2003-002',
      department: 'Neurology',
      consultationFee: 2000,
      availability: [
        {
          day: 'Tuesday',
          slots: [
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '10:30', endTime: '11:00', isAvailable: true },
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '11:30', endTime: '12:00', isAvailable: true },
            { startTime: '15:00', endTime: '15:30', isAvailable: true },
            { startTime: '15:30', endTime: '16:00', isAvailable: true }
          ]
        },
        {
          day: 'Thursday',
          slots: [
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '10:30', endTime: '11:00', isAvailable: true },
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '15:00', endTime: '15:30', isAvailable: true },
            { startTime: '15:30', endTime: '16:00', isAvailable: true }
          ]
        },
        {
          day: 'Saturday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '10:30', endTime: '11:00', isAvailable: true }
          ]
        }
      ],
      rating: 4.9,
      totalRatings: 178,
      isAvailable: true
    },
    {
      userId: doctorUsers[2]._id,
      specialization: 'Pediatrics',
      qualification: 'MBBS, MD (Pediatrics)',
      experience: 13,
      licenseNumber: 'MCI-PED-2011-003',
      department: 'Pediatrics',
      consultationFee: 800,
      availability: [
        {
          day: 'Monday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '10:30', endTime: '11:00', isAvailable: true },
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '11:30', endTime: '12:00', isAvailable: true }
          ]
        },
        {
          day: 'Wednesday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '14:00', endTime: '14:30', isAvailable: true },
            { startTime: '14:30', endTime: '15:00', isAvailable: true }
          ]
        },
        {
          day: 'Friday',
          slots: [
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true },
            { startTime: '14:00', endTime: '14:30', isAvailable: true }
          ]
        }
      ],
      rating: 4.7,
      totalRatings: 302,
      isAvailable: true
    },
    {
      userId: doctorUsers[3]._id,
      specialization: 'Orthopedics',
      qualification: 'MBBS, MS (Orthopedics)',
      experience: 25,
      licenseNumber: 'MCI-ORTHO-1999-004',
      department: 'Orthopedics',
      consultationFee: 1200,
      availability: [
        {
          day: 'Monday',
          slots: [
            { startTime: '08:00', endTime: '08:30', isAvailable: true },
            { startTime: '08:30', endTime: '09:00', isAvailable: true },
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:30', isAvailable: true }
          ]
        },
        {
          day: 'Thursday',
          slots: [
            { startTime: '08:00', endTime: '08:30', isAvailable: true },
            { startTime: '08:30', endTime: '09:00', isAvailable: true },
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '14:00', endTime: '14:30', isAvailable: true },
            { startTime: '14:30', endTime: '15:00', isAvailable: true }
          ]
        },
        {
          day: 'Saturday',
          slots: [
            { startTime: '08:00', endTime: '08:30', isAvailable: true },
            { startTime: '08:30', endTime: '09:00', isAvailable: true },
            { startTime: '09:00', endTime: '09:30', isAvailable: true },
            { startTime: '09:30', endTime: '10:00', isAvailable: true }
          ]
        }
      ],
      rating: 4.6,
      totalRatings: 390,
      isAvailable: true
    },
    {
      userId: doctorUsers[4]._id,
      specialization: 'Dermatology',
      qualification: 'MBBS, MD (Dermatology)',
      experience: 10,
      licenseNumber: 'MCI-DERM-2014-005',
      department: 'Dermatology',
      consultationFee: 1000,
      availability: [
        {
          day: 'Tuesday',
          slots: [
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '11:30', endTime: '12:00', isAvailable: true },
            { startTime: '12:00', endTime: '12:30', isAvailable: true },
            { startTime: '15:00', endTime: '15:30', isAvailable: true },
            { startTime: '15:30', endTime: '16:00', isAvailable: true }
          ]
        },
        {
          day: 'Wednesday',
          slots: [
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '11:30', endTime: '12:00', isAvailable: true },
            { startTime: '12:00', endTime: '12:30', isAvailable: true },
            { startTime: '15:00', endTime: '15:30', isAvailable: true }
          ]
        },
        {
          day: 'Friday',
          slots: [
            { startTime: '11:00', endTime: '11:30', isAvailable: true },
            { startTime: '11:30', endTime: '12:00', isAvailable: true },
            { startTime: '12:00', endTime: '12:30', isAvailable: true },
            { startTime: '15:00', endTime: '15:30', isAvailable: true },
            { startTime: '15:30', endTime: '16:00', isAvailable: true }
          ]
        }
      ],
      rating: 4.5,
      totalRatings: 124,
      isAvailable: true
    },
    {
      userId: doctorUsers[5]._id,
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (General Medicine)',
      experience: 16,
      licenseNumber: 'MCI-GM-2008-006',
      department: 'General Medicine',
      consultationFee: 600,
      availability: [
        {
          day: 'Monday',
          slots: [
            { startTime: '09:00', endTime: '09:20', isAvailable: true },
            { startTime: '09:20', endTime: '09:40', isAvailable: true },
            { startTime: '09:40', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:20', isAvailable: true },
            { startTime: '10:20', endTime: '10:40', isAvailable: true },
            { startTime: '10:40', endTime: '11:00', isAvailable: true }
          ]
        },
        {
          day: 'Tuesday',
          slots: [
            { startTime: '09:00', endTime: '09:20', isAvailable: true },
            { startTime: '09:20', endTime: '09:40', isAvailable: true },
            { startTime: '09:40', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:20', isAvailable: true },
            { startTime: '14:00', endTime: '14:20', isAvailable: true },
            { startTime: '14:20', endTime: '14:40', isAvailable: true }
          ]
        },
        {
          day: 'Wednesday',
          slots: [
            { startTime: '09:00', endTime: '09:20', isAvailable: true },
            { startTime: '09:20', endTime: '09:40', isAvailable: true },
            { startTime: '09:40', endTime: '10:00', isAvailable: true },
            { startTime: '14:00', endTime: '14:20', isAvailable: true },
            { startTime: '14:20', endTime: '14:40', isAvailable: true }
          ]
        },
        {
          day: 'Thursday',
          slots: [
            { startTime: '09:00', endTime: '09:20', isAvailable: true },
            { startTime: '09:20', endTime: '09:40', isAvailable: true },
            { startTime: '09:40', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:20', isAvailable: true },
            { startTime: '14:00', endTime: '14:20', isAvailable: true }
          ]
        },
        {
          day: 'Friday',
          slots: [
            { startTime: '09:00', endTime: '09:20', isAvailable: true },
            { startTime: '09:20', endTime: '09:40', isAvailable: true },
            { startTime: '09:40', endTime: '10:00', isAvailable: true },
            { startTime: '10:00', endTime: '10:20', isAvailable: true },
            { startTime: '14:00', endTime: '14:20', isAvailable: true },
            { startTime: '14:20', endTime: '14:40', isAvailable: true }
          ]
        }
      ],
      rating: 4.4,
      totalRatings: 520,
      isAvailable: true
    }
  ];

  const doctorProfiles = [];
  for (const data of doctorProfileData) {
    const doctor = await Doctor.create(data);
    doctorProfiles.push(doctor);
    const user = doctorUsers.find(u => u._id.toString() === data.userId.toString());
    console.log(`  Created doctor profile for: ${user.name}`);
  }

  console.log(`Doctor seeding complete. Created ${doctorProfiles.length} doctor profiles.\n`);
  return doctorProfiles;
}

async function seedPatients() {
  console.log('Seeding patient users and profiles...');

  const patientUserData = [
    {
      name: 'Arjun Malhotra',
      email: 'arjun.malhotra@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345601',
      address: { street: '22 Vasant Kunj', city: 'New Delhi', state: 'Delhi', zipCode: '110070', country: 'India' },
      dateOfBirth: new Date('1978-03-14'),
      gender: 'Male'
    },
    {
      name: 'Sneha Kapoor',
      email: 'sneha.kapoor@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345602',
      address: { street: '8 Linking Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400050', country: 'India' },
      dateOfBirth: new Date('1990-07-28'),
      gender: 'Female'
    },
    {
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345603',
      address: { street: '5 Ashok Nagar', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600083', country: 'India' },
      dateOfBirth: new Date('1965-11-05'),
      gender: 'Male'
    },
    {
      name: 'Meera Joshi',
      email: 'meera.joshi@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345604',
      address: { street: '17 Shastri Nagar', city: 'Jaipur', state: 'Rajasthan', zipCode: '302016', country: 'India' },
      dateOfBirth: new Date('1995-02-19'),
      gender: 'Female'
    },
    {
      name: 'Aditya Singh',
      email: 'aditya.singh@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345605',
      address: { street: '3 Gomti Nagar', city: 'Lucknow', state: 'Uttar Pradesh', zipCode: '226010', country: 'India' },
      dateOfBirth: new Date('1988-09-11'),
      gender: 'Male'
    },
    {
      name: 'Pooja Reddy',
      email: 'pooja.reddy@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345606',
      address: { street: '41 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', zipCode: '500033', country: 'India' },
      dateOfBirth: new Date('1975-06-30'),
      gender: 'Female'
    },
    {
      name: 'Rohit Gupta',
      email: 'rohit.gupta@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345607',
      address: { street: '29 Koramangala', city: 'Bengaluru', state: 'Karnataka', zipCode: '560034', country: 'India' },
      dateOfBirth: new Date('1998-12-03'),
      gender: 'Male'
    },
    {
      name: 'Kavitha Menon',
      email: 'kavitha.menon@gmail.com',
      password: 'Patient@123',
      role: 'Patient',
      phone: '9812345608',
      address: { street: '11 Palarivattom', city: 'Kochi', state: 'Kerala', zipCode: '682025', country: 'India' },
      dateOfBirth: new Date('1965-04-16'),
      gender: 'Female'
    }
  ];

  const patientUsers = [];
  for (const data of patientUserData) {
    const user = await User.create(data);
    patientUsers.push(user);
    console.log(`  Created patient user: ${user.name} (${user.email})`);
  }

  const patientProfileData = [
    {
      userId: patientUsers[0]._id,
      patientId: 'PAT000001',
      bloodGroup: 'B+',
      emergencyContact: { name: 'Sunita Malhotra', phone: '9812345699', relation: 'Spouse' },
      medicalHistory: [
        {
          condition: 'Essential Hypertension',
          diagnosedDate: new Date('2015-04-10'),
          status: 'Chronic',
          notes: 'BP ranges 140-160/90-100 mmHg. On regular antihypertensive medication.'
        },
        {
          condition: 'Type 2 Diabetes Mellitus',
          diagnosedDate: new Date('2018-08-22'),
          status: 'Active',
          notes: 'HbA1c 7.8%. On oral hypoglycaemics. Diet counselling advised.'
        }
      ],
      allergies: ['Penicillin'],
      currentMedications: [
        { medicine: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', startDate: new Date('2015-05-01') },
        { medicine: 'Metformin 500mg', dosage: '500mg', frequency: 'Twice daily with meals', startDate: new Date('2018-09-01') }
      ]
    },
    {
      userId: patientUsers[1]._id,
      patientId: 'PAT000002',
      bloodGroup: 'A+',
      emergencyContact: { name: 'Ramesh Kapoor', phone: '9812345698', relation: 'Father' },
      medicalHistory: [
        {
          condition: 'Bronchial Asthma',
          diagnosedDate: new Date('2010-03-15'),
          status: 'Chronic',
          notes: 'Mild persistent asthma. Triggered by dust, pollen and cold air. Uses inhaler as rescue medication.'
        }
      ],
      allergies: ['Aspirin', 'Dust', 'Pollen'],
      currentMedications: [
        { medicine: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed (rescue)', startDate: new Date('2010-04-01') },
        { medicine: 'Montelukast 10mg', dosage: '10mg', frequency: 'Once daily at bedtime', startDate: new Date('2020-01-15') }
      ]
    },
    {
      userId: patientUsers[2]._id,
      patientId: 'PAT000003',
      bloodGroup: 'O+',
      emergencyContact: { name: 'Lalitha Kumar', phone: '9812345697', relation: 'Spouse' },
      medicalHistory: [
        {
          condition: 'Right Knee Osteoarthritis',
          diagnosedDate: new Date('2016-09-20'),
          status: 'Chronic',
          notes: 'Grade 3 osteoarthritis right knee. Underwent arthroscopy in 2021. On physiotherapy and analgesics.'
        },
        {
          condition: 'Essential Hypertension',
          diagnosedDate: new Date('2019-02-14'),
          status: 'Chronic',
          notes: 'Well-controlled on Losartan 50mg daily.'
        }
      ],
      allergies: ['Iodine'],
      currentMedications: [
        { medicine: 'Losartan 50mg', dosage: '50mg', frequency: 'Once daily', startDate: new Date('2019-03-01') },
        { medicine: 'Calcium + Vitamin D supplement', dosage: '500mg + 250IU', frequency: 'Twice daily', startDate: new Date('2020-06-01') }
      ],
      admissionHistory: [
        {
          admissionDate: new Date('2021-05-10'),
          dischargeDate: new Date('2021-05-14'),
          reason: 'Right knee arthroscopy — debridement and partial meniscectomy',
          ward: 'Orthopedic Ward',
          attendingDoctor: 'Dr. Rajan Patel'
        }
      ]
    },
    {
      userId: patientUsers[3]._id,
      patientId: 'PAT000004',
      bloodGroup: 'AB+',
      emergencyContact: { name: 'Prakash Joshi', phone: '9812345696', relation: 'Father' },
      medicalHistory: [],
      allergies: [],
      currentMedications: []
    },
    {
      userId: patientUsers[4]._id,
      patientId: 'PAT000005',
      bloodGroup: 'B-',
      emergencyContact: { name: 'Kavita Singh', phone: '9812345695', relation: 'Mother' },
      medicalHistory: [
        {
          condition: 'Type 2 Diabetes Mellitus',
          diagnosedDate: new Date('2014-11-05'),
          status: 'Active',
          notes: 'Insulin-dependent diabetes. HbA1c 8.4%. Poor glycaemic control despite oral agents — switched to insulin.'
        }
      ],
      allergies: [],
      currentMedications: [
        { medicine: 'Insulin Glargine (Lantus)', dosage: '20 units', frequency: 'Once daily at bedtime', startDate: new Date('2020-03-10') }
      ]
    },
    {
      userId: patientUsers[5]._id,
      patientId: 'PAT000006',
      bloodGroup: 'O-',
      emergencyContact: { name: 'Suresh Reddy', phone: '9812345694', relation: 'Spouse' },
      medicalHistory: [
        {
          condition: 'Essential Hypertension',
          diagnosedDate: new Date('2012-06-20'),
          status: 'Chronic',
          notes: 'Stage 1 hypertension. Well-controlled on Amlodipine and Losartan combination.'
        },
        {
          condition: 'Hypothyroidism',
          diagnosedDate: new Date('2017-01-08'),
          status: 'Active',
          notes: 'TSH 7.5 mIU/L. On Levothyroxine 50mcg daily. Regular TSH monitoring required.'
        }
      ],
      allergies: ['NSAIDs'],
      currentMedications: [
        { medicine: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', startDate: new Date('2012-07-01') },
        { medicine: 'Losartan 50mg', dosage: '50mg', frequency: 'Once daily', startDate: new Date('2018-02-01') },
        { medicine: 'Levothyroxine 50mcg', dosage: '50mcg', frequency: 'Once daily on empty stomach', startDate: new Date('2017-02-01') }
      ]
    },
    {
      userId: patientUsers[6]._id,
      patientId: 'PAT000007',
      bloodGroup: 'A-',
      emergencyContact: { name: 'Meena Gupta', phone: '9812345693', relation: 'Mother' },
      medicalHistory: [],
      allergies: [],
      currentMedications: []
    },
    {
      userId: patientUsers[7]._id,
      patientId: 'PAT000008',
      bloodGroup: 'AB-',
      emergencyContact: { name: 'Suresh Menon', phone: '9812345692', relation: 'Spouse' },
      medicalHistory: [
        {
          condition: 'Rheumatoid Arthritis',
          diagnosedDate: new Date('2005-08-12'),
          status: 'Chronic',
          notes: 'Seropositive RA. Bilateral joint involvement — hands, wrists and knees. On DMARDs.'
        },
        {
          condition: 'Essential Hypertension',
          diagnosedDate: new Date('2010-03-22'),
          status: 'Chronic',
          notes: 'Managed with Amlodipine. BP reasonably controlled.'
        }
      ],
      allergies: [],
      currentMedications: [
        { medicine: 'Methotrexate 10mg', dosage: '10mg', frequency: 'Once weekly', startDate: new Date('2006-01-01') },
        { medicine: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', startDate: new Date('2010-04-01') },
        { medicine: 'Folic Acid 5mg', dosage: '5mg', frequency: 'Once daily except methotrexate day', startDate: new Date('2006-01-15') }
      ]
    }
  ];

  const patientProfiles = [];
  for (const data of patientProfileData) {
    const patient = await Patient.create(data);
    patientProfiles.push(patient);
    const user = patientUsers.find(u => u._id.toString() === data.userId.toString());
    console.log(`  Created patient profile for: ${user.name} (ID: ${patient.patientId})`);
  }

  console.log(`Patient seeding complete. Created ${patientProfiles.length} patient profiles.\n`);
  return patientProfiles;
}

async function seedStaff(adminUsers) {
  console.log('Seeding staff users and profiles...');

  const staffUserData = [
    {
      name: 'Tulika Sharma',
      email: 'tulika.sharma@medilink.com',
      password: 'Staff@123',
      role: 'Nurse',
      subRole: 'Nurse',
      phone: '9812345710',
      address: { street: '14 Sector 18', city: 'Noida', state: 'Uttar Pradesh', zipCode: '201301', country: 'India' },
      dateOfBirth: new Date('1992-04-25'),
      gender: 'Female'
    },
    {
      name: 'Sunita Rao',
      email: 'sunita.rao@medilink.com',
      password: 'Staff@123',
      role: 'Nurse',
      subRole: 'Nurse',
      phone: '9812345711',
      address: { street: '7 Ameerpet', city: 'Hyderabad', state: 'Telangana', zipCode: '500016', country: 'India' },
      dateOfBirth: new Date('1989-08-17'),
      gender: 'Female'
    },
    {
      name: 'Kanan Jain',
      email: 'kanan.jain@medilink.com',
      password: 'Staff@123',
      role: 'Receptionist',
      subRole: 'Receptionist',
      phone: '9812345712',
      address: { street: '32 Navrangpura', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380009', country: 'India' },
      dateOfBirth: new Date('1994-01-12'),
      gender: 'Female'
    },
    {
      name: 'Neha Gupta',
      email: 'neha.gupta@medilink.com',
      password: 'Staff@123',
      role: 'Receptionist',
      subRole: 'Receptionist',
      phone: '9812345713',
      address: { street: '21 Lajpat Nagar', city: 'New Delhi', state: 'Delhi', zipCode: '110024', country: 'India' },
      dateOfBirth: new Date('1996-10-30'),
      gender: 'Female'
    },
    {
      name: 'Manik Shukla',
      email: 'manik.shukla@medilink.com',
      password: 'Staff@123',
      role: 'Pharmacist',
      subRole: 'Pharmacist',
      phone: '9812345714',
      address: { street: '6 Hazratganj', city: 'Lucknow', state: 'Uttar Pradesh', zipCode: '226001', country: 'India' },
      dateOfBirth: new Date('1987-07-07'),
      gender: 'Male'
    }
  ];

  const staffUsers = [];
  for (const data of staffUserData) {
    const user = await User.create(data);
    staffUsers.push(user);
    console.log(`  Created staff user: ${user.name} (${user.email})`);
  }

  const staffProfileData = [
    {
      userId: staffUsers[0]._id,
      designation: 'Senior Staff Nurse',
      department: 'Cardiology',
      qualification: 'B.Sc Nursing',
      joiningDate: new Date('2018-06-01'),
      employmentType: 'Full-Time',
      shift: 'Morning',
      workSchedule: [
        { day: 'Monday', startTime: '07:00', endTime: '15:00' },
        { day: 'Tuesday', startTime: '07:00', endTime: '15:00' },
        { day: 'Wednesday', startTime: '07:00', endTime: '15:00' },
        { day: 'Thursday', startTime: '07:00', endTime: '15:00' },
        { day: 'Friday', startTime: '07:00', endTime: '15:00' }
      ],
      salary: { basic: 35000, allowances: 8000, total: 43000 },
      supervisor: adminUsers[0]._id,
      skills: ['IV Cannulation', 'Wound Dressing', 'ECG Monitoring', 'Patient Assessment'],
      isActive: true
    },
    {
      userId: staffUsers[1]._id,
      designation: 'Staff Nurse',
      department: 'General Medicine',
      qualification: 'GNM (General Nursing and Midwifery)',
      joiningDate: new Date('2020-02-15'),
      employmentType: 'Full-Time',
      shift: 'Evening',
      workSchedule: [
        { day: 'Monday', startTime: '15:00', endTime: '23:00' },
        { day: 'Tuesday', startTime: '15:00', endTime: '23:00' },
        { day: 'Wednesday', startTime: '15:00', endTime: '23:00' },
        { day: 'Thursday', startTime: '15:00', endTime: '23:00' },
        { day: 'Saturday', startTime: '15:00', endTime: '23:00' }
      ],
      salary: { basic: 28000, allowances: 6500, total: 34500 },
      supervisor: adminUsers[0]._id,
      skills: ['Medication Administration', 'Patient Monitoring', 'Catheter Care', 'Basic Life Support'],
      isActive: true
    },
    {
      userId: staffUsers[2]._id,
      designation: 'Front Desk Receptionist',
      department: 'Administration',
      qualification: 'BBA',
      joiningDate: new Date('2021-09-01'),
      employmentType: 'Full-Time',
      shift: 'Morning',
      workSchedule: [
        { day: 'Monday', startTime: '08:00', endTime: '16:00' },
        { day: 'Tuesday', startTime: '08:00', endTime: '16:00' },
        { day: 'Wednesday', startTime: '08:00', endTime: '16:00' },
        { day: 'Thursday', startTime: '08:00', endTime: '16:00' },
        { day: 'Friday', startTime: '08:00', endTime: '16:00' }
      ],
      salary: { basic: 22000, allowances: 4000, total: 26000 },
      supervisor: adminUsers[1]._id,
      skills: ['Patient Registration', 'Appointment Scheduling', 'Medical Records Management', 'Billing Assistance'],
      isActive: true
    },
    {
      userId: staffUsers[3]._id,
      designation: 'Receptionist',
      department: 'Administration',
      qualification: 'B.Com',
      joiningDate: new Date('2022-03-10'),
      employmentType: 'Full-Time',
      shift: 'Evening',
      workSchedule: [
        { day: 'Monday', startTime: '14:00', endTime: '22:00' },
        { day: 'Tuesday', startTime: '14:00', endTime: '22:00' },
        { day: 'Thursday', startTime: '14:00', endTime: '22:00' },
        { day: 'Friday', startTime: '14:00', endTime: '22:00' },
        { day: 'Saturday', startTime: '14:00', endTime: '22:00' }
      ],
      salary: { basic: 20000, allowances: 3500, total: 23500 },
      supervisor: adminUsers[1]._id,
      skills: ['Patient Registration', 'Data Entry', 'Customer Service'],
      isActive: true
    },
    {
      userId: staffUsers[4]._id,
      designation: 'Clinical Pharmacist',
      department: 'Pharmacy',
      qualification: 'B.Pharm, M.Pharm',
      joiningDate: new Date('2019-07-20'),
      employmentType: 'Full-Time',
      shift: 'Morning',
      workSchedule: [
        { day: 'Monday', startTime: '08:00', endTime: '16:00' },
        { day: 'Tuesday', startTime: '08:00', endTime: '16:00' },
        { day: 'Wednesday', startTime: '08:00', endTime: '16:00' },
        { day: 'Thursday', startTime: '08:00', endTime: '16:00' },
        { day: 'Friday', startTime: '08:00', endTime: '16:00' },
        { day: 'Saturday', startTime: '08:00', endTime: '13:00' }
      ],
      salary: { basic: 38000, allowances: 7000, total: 45000 },
      supervisor: adminUsers[2]._id,
      skills: ['Drug Dispensing', 'Drug Interaction Analysis', 'Inventory Management', 'Patient Counselling'],
      isActive: true
    }
  ];

  const staffProfiles = [];
  for (const data of staffProfileData) {
    const staff = await Staff.create(data);
    staffProfiles.push(staff);
    const user = staffUsers.find(u => u._id.toString() === data.userId.toString());
    console.log(`  Created staff profile for: ${user.name} (Employee ID: ${staff.employeeId})`);
  }

  console.log(`Staff seeding complete. Created ${staffProfiles.length} staff profiles.\n`);
  return staffProfiles;
}

async function seedWards() {
  console.log('Seeding wards...');

  const generateBeds = (prefix, total, occupied) => {
    const beds = [];
    for (let i = 1; i <= total; i++) {
      beds.push({
        bedNumber: `${prefix}-${String(i).padStart(2, '0')}`,
        isOccupied: i <= occupied
      });
    }
    return beds;
  };

  const wardData = [
    {
      wardNumber: 'WARD-GEN-A',
      wardName: 'General Ward A',
      wardType: 'General',
      department: 'General Medicine',
      floor: 2,
      totalBeds: 20,
      availableBeds: 13,
      beds: generateBeds('GA', 20, 7),
      gender: 'Mixed',
      facilities: ['Nursing Station', 'Oxygen Supply', 'Emergency Call Bells', 'Television', 'Attached Washroom'],
      dailyRate: 1500
    },
    {
      wardNumber: 'WARD-ICU-01',
      wardName: 'Intensive Care Unit',
      wardType: 'ICU',
      department: 'Critical Care',
      floor: 3,
      totalBeds: 8,
      availableBeds: 3,
      beds: generateBeds('ICU', 8, 5),
      gender: 'Mixed',
      facilities: ['Ventilators', 'Cardiac Monitors', 'Defibrillators', 'Infusion Pumps', '24-hour Nursing', 'Central Oxygen'],
      dailyRate: 8000
    },
    {
      wardNumber: 'WARD-PVT-01',
      wardName: 'Private Ward',
      wardType: 'Private',
      department: 'General',
      floor: 4,
      totalBeds: 10,
      availableBeds: 6,
      beds: generateBeds('PVT', 10, 4),
      gender: 'Mixed',
      facilities: ['Air Conditioning', 'Attached Bathroom', 'Television', 'Refrigerator', 'Sofa for Attendant', 'Wi-Fi', 'Room Service'],
      dailyRate: 4500
    },
    {
      wardNumber: 'WARD-EMG-01',
      wardName: 'Emergency Ward',
      wardType: 'Emergency',
      department: 'Emergency Medicine',
      floor: 1,
      totalBeds: 12,
      availableBeds: 7,
      beds: generateBeds('EMG', 12, 5),
      gender: 'Mixed',
      facilities: ['Crash Cart', 'Defibrillator', 'Oxygen', 'Suction Apparatus', 'IV Infusion Stands', '24-hour Doctor Coverage'],
      dailyRate: 3000
    },
    {
      wardNumber: 'WARD-PED-01',
      wardName: 'Pediatric Ward',
      wardType: 'General',
      department: 'Pediatrics',
      floor: 2,
      totalBeds: 15,
      availableBeds: 11,
      beds: generateBeds('PED', 15, 4),
      gender: 'Mixed',
      facilities: ['Play Area', 'Child-safe Beds with Rails', 'Oxygen Supply', 'Nursing Station', 'Pediatric Emergency Trolley'],
      dailyRate: 2000
    }
  ];

  const wards = [];
  for (const data of wardData) {
    const ward = await Ward.create(data);
    wards.push(ward);
    console.log(`  Created ward: ${ward.wardName} (${ward.wardNumber}) — ${ward.totalBeds} beds, ${ward.availableBeds} available`);
  }

  console.log(`Ward seeding complete. Created ${wards.length} wards.\n`);
  return wards;
}

async function seedMedicines() {
  console.log('Seeding medicines...');

  const medicineData = [
    {
      name: 'Crocin 500mg',
      genericName: 'Paracetamol',
      manufacturer: 'GlaxoSmithKline Pharmaceuticals',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      strength: '500mg',
      unitPrice: 2.5,
      stockQuantity: 1200,
      reorderLevel: 200,
      expiryDate: new Date('2027-06-30'),
      batchNumber: 'CRO-2025-001',
      prescriptionRequired: false,
      storageConditions: 'Store below 25°C in a dry place',
      sideEffects: ['Nausea', 'Vomiting', 'Liver damage on overdose'],
      contraindications: ['Severe hepatic impairment', 'Paracetamol hypersensitivity']
    },
    {
      name: 'Dolo 650',
      genericName: 'Paracetamol',
      manufacturer: 'Micro Labs Limited',
      category: 'Analgesic',
      dosageForm: 'Tablet',
      strength: '650mg',
      unitPrice: 3.5,
      stockQuantity: 900,
      reorderLevel: 150,
      expiryDate: new Date('2027-03-31'),
      batchNumber: 'DOL-2025-002',
      prescriptionRequired: false,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Nausea', 'Allergic skin reactions'],
      contraindications: ['Hepatic impairment', 'Renal impairment (high doses)']
    },
    {
      name: 'Brufen 400mg',
      genericName: 'Ibuprofen',
      manufacturer: 'Abbott India Limited',
      category: 'Anti-inflammatory',
      dosageForm: 'Tablet',
      strength: '400mg',
      unitPrice: 5.0,
      stockQuantity: 600,
      reorderLevel: 100,
      expiryDate: new Date('2027-09-30'),
      batchNumber: 'BRU-2025-003',
      prescriptionRequired: false,
      storageConditions: 'Store below 25°C',
      sideEffects: ['Gastric irritation', 'Nausea', 'Dizziness', 'Headache'],
      contraindications: ['Peptic ulcer', 'Aspirin hypersensitivity', 'Severe renal impairment', 'Pregnancy (3rd trimester)']
    },
    {
      name: 'Voveran 50mg',
      genericName: 'Diclofenac Sodium',
      manufacturer: 'Novartis India Limited',
      category: 'Anti-inflammatory',
      dosageForm: 'Tablet',
      strength: '50mg',
      unitPrice: 6.5,
      stockQuantity: 400,
      reorderLevel: 80,
      expiryDate: new Date('2026-12-31'),
      batchNumber: 'VOV-2025-004',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C away from moisture',
      sideEffects: ['Gastric pain', 'Nausea', 'Elevated liver enzymes', 'Fluid retention'],
      contraindications: ['NSAID hypersensitivity', 'Active peptic ulcer', 'Severe heart failure', 'Pregnancy']
    },
    {
      name: 'Azee 500mg',
      genericName: 'Azithromycin',
      manufacturer: 'Cipla Limited',
      category: 'Antibiotic',
      dosageForm: 'Tablet',
      strength: '500mg',
      unitPrice: 32.0,
      stockQuantity: 350,
      reorderLevel: 60,
      expiryDate: new Date('2027-01-31'),
      batchNumber: 'AZE-2025-005',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Diarrhoea', 'Nausea', 'Abdominal pain', 'QT prolongation'],
      contraindications: ['Macrolide hypersensitivity', 'Hepatic impairment', 'QT prolongation']
    },
    {
      name: 'Amoxil 500mg',
      genericName: 'Amoxicillin',
      manufacturer: 'GlaxoSmithKline Pharmaceuticals',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      strength: '500mg',
      unitPrice: 12.0,
      stockQuantity: 500,
      reorderLevel: 80,
      expiryDate: new Date('2027-05-31'),
      batchNumber: 'AMX-2025-006',
      prescriptionRequired: true,
      storageConditions: 'Store below 25°C in airtight container',
      sideEffects: ['Diarrhoea', 'Nausea', 'Skin rash', 'Anaphylaxis (rare)'],
      contraindications: ['Penicillin hypersensitivity', 'Infectious mononucleosis']
    },
    {
      name: 'Taxim-O 200mg',
      genericName: 'Cefixime',
      manufacturer: 'Alkem Laboratories',
      category: 'Antibiotic',
      dosageForm: 'Capsule',
      strength: '200mg',
      unitPrice: 42.0,
      stockQuantity: 280,
      reorderLevel: 50,
      expiryDate: new Date('2026-10-31'),
      batchNumber: 'TAX-2025-007',
      prescriptionRequired: true,
      storageConditions: 'Store at room temperature away from light',
      sideEffects: ['Diarrhoea', 'Abdominal pain', 'Nausea', 'Headache'],
      contraindications: ['Cephalosporin hypersensitivity', 'Renal impairment (dose adjustment)']
    },
    {
      name: 'Flagyl 400mg',
      genericName: 'Metronidazole',
      manufacturer: 'Abbott India Limited',
      category: 'Antibiotic',
      dosageForm: 'Tablet',
      strength: '400mg',
      unitPrice: 8.0,
      stockQuantity: 400,
      reorderLevel: 70,
      expiryDate: new Date('2027-02-28'),
      batchNumber: 'FLG-2025-008',
      prescriptionRequired: true,
      storageConditions: 'Store below 25°C protected from light',
      sideEffects: ['Nausea', 'Metallic taste', 'Dizziness', 'Peripheral neuropathy (long-term)'],
      contraindications: ['First trimester of pregnancy', 'Alcohol consumption', 'Hypersensitivity to nitroimidazoles']
    },
    {
      name: 'Glucophage 500mg',
      genericName: 'Metformin Hydrochloride',
      manufacturer: 'Merck Limited',
      category: 'Antidiabetic',
      dosageForm: 'Tablet',
      strength: '500mg',
      unitPrice: 4.5,
      stockQuantity: 800,
      reorderLevel: 120,
      expiryDate: new Date('2027-08-31'),
      batchNumber: 'GLC-2025-009',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Nausea', 'Diarrhoea', 'Abdominal pain', 'Lactic acidosis (rare)'],
      contraindications: ['Renal impairment (eGFR <30)', 'Hepatic impairment', 'Iodine contrast dye procedures']
    },
    {
      name: 'Amaryl 2mg',
      genericName: 'Glimepiride',
      manufacturer: 'Sanofi India Limited',
      category: 'Antidiabetic',
      dosageForm: 'Tablet',
      strength: '2mg',
      unitPrice: 14.0,
      stockQuantity: 350,
      reorderLevel: 60,
      expiryDate: new Date('2026-11-30'),
      batchNumber: 'AMR-2025-010',
      prescriptionRequired: true,
      storageConditions: 'Store below 25°C',
      sideEffects: ['Hypoglycaemia', 'Nausea', 'Weight gain', 'Dizziness'],
      contraindications: ['Type 1 diabetes', 'Renal/hepatic impairment', 'Sulphonylurea hypersensitivity', 'Pregnancy']
    },
    {
      name: 'Lantus',
      genericName: 'Insulin Glargine',
      manufacturer: 'Sanofi India Limited',
      category: 'Antidiabetic',
      dosageForm: 'Injection',
      strength: '100 U/mL',
      unitPrice: 850.0,
      stockQuantity: 120,
      reorderLevel: 20,
      expiryDate: new Date('2026-07-31'),
      batchNumber: 'LAN-2025-011',
      prescriptionRequired: true,
      storageConditions: 'Unopened: store in refrigerator (2-8°C). Opened: store below 30°C, use within 4 weeks',
      sideEffects: ['Hypoglycaemia', 'Lipodystrophy at injection site', 'Weight gain'],
      contraindications: ['Hypoglycaemia episodes', 'Insulin hypersensitivity']
    },
    {
      name: 'Amlokind 5mg',
      genericName: 'Amlodipine Besylate',
      manufacturer: 'Mankind Pharma',
      category: 'Antihypertensive',
      dosageForm: 'Tablet',
      strength: '5mg',
      unitPrice: 5.0,
      stockQuantity: 700,
      reorderLevel: 100,
      expiryDate: new Date('2027-04-30'),
      batchNumber: 'AML-2025-012',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C in a dry place',
      sideEffects: ['Peripheral oedema', 'Headache', 'Flushing', 'Palpitations'],
      contraindications: ['Cardiogenic shock', 'Unstable angina', 'Dihydropyridine hypersensitivity']
    },
    {
      name: 'Tenormin 25mg',
      genericName: 'Atenolol',
      manufacturer: 'AstraZeneca India',
      category: 'Antihypertensive',
      dosageForm: 'Tablet',
      strength: '25mg',
      unitPrice: 4.0,
      stockQuantity: 500,
      reorderLevel: 80,
      expiryDate: new Date('2027-07-31'),
      batchNumber: 'TEN-2025-013',
      prescriptionRequired: true,
      storageConditions: 'Store below 25°C protected from moisture and light',
      sideEffects: ['Bradycardia', 'Fatigue', 'Cold extremities', 'Bronchospasm', 'Sleep disturbances'],
      contraindications: ['Asthma', 'Heart block', 'Sick sinus syndrome', 'Cardiogenic shock']
    },
    {
      name: 'Cozaar 50mg',
      genericName: 'Losartan Potassium',
      manufacturer: 'MSD Pharmaceuticals',
      category: 'Antihypertensive',
      dosageForm: 'Tablet',
      strength: '50mg',
      unitPrice: 22.0,
      stockQuantity: 380,
      reorderLevel: 60,
      expiryDate: new Date('2027-10-31'),
      batchNumber: 'COZ-2025-014',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Dizziness', 'Hyperkalaemia', 'Elevated creatinine', 'Cough (less than ACE inhibitors)'],
      contraindications: ['Pregnancy', 'Bilateral renal artery stenosis', 'Hyperkalaemia']
    },
    {
      name: 'Ecosprin 75mg',
      genericName: 'Aspirin',
      manufacturer: 'USV Private Limited',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '75mg',
      unitPrice: 2.0,
      stockQuantity: 1000,
      reorderLevel: 150,
      expiryDate: new Date('2027-12-31'),
      batchNumber: 'ECO-2025-015',
      prescriptionRequired: false,
      storageConditions: 'Store below 25°C away from moisture',
      sideEffects: ['Gastric irritation', 'GI bleeding', 'Tinnitus (high doses)', 'Prolonged bleeding time'],
      contraindications: ['Aspirin hypersensitivity', 'Active peptic ulcer', 'Bleeding disorders', 'Children with viral illness']
    },
    {
      name: 'Storvas 20mg',
      genericName: 'Atorvastatin Calcium',
      manufacturer: 'Cipla Limited',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '20mg',
      unitPrice: 18.0,
      stockQuantity: 450,
      reorderLevel: 70,
      expiryDate: new Date('2027-06-30'),
      batchNumber: 'STV-2025-016',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Myalgia', 'Elevated liver enzymes', 'Rhabdomyolysis (rare)', 'Headache'],
      contraindications: ['Active hepatic disease', 'Pregnancy', 'Breastfeeding', 'CYP3A4 inhibitor use']
    },
    {
      name: 'Pantocid 40mg',
      genericName: 'Pantoprazole Sodium',
      manufacturer: 'Sun Pharmaceutical Industries',
      category: 'Gastrointestinal',
      dosageForm: 'Tablet',
      strength: '40mg',
      unitPrice: 10.0,
      stockQuantity: 600,
      reorderLevel: 90,
      expiryDate: new Date('2027-03-31'),
      batchNumber: 'PAN-2025-017',
      prescriptionRequired: true,
      storageConditions: 'Store below 25°C protected from moisture',
      sideEffects: ['Headache', 'Diarrhoea', 'Nausea', 'Hypomagnesaemia (long-term)', 'C. diff infection'],
      contraindications: ['PPI hypersensitivity', 'Co-administration with atazanavir']
    },
    {
      name: 'Omez 20mg',
      genericName: 'Omeprazole',
      manufacturer: 'Dr. Reddys Laboratories',
      category: 'Gastrointestinal',
      dosageForm: 'Capsule',
      strength: '20mg',
      unitPrice: 8.5,
      stockQuantity: 500,
      reorderLevel: 80,
      expiryDate: new Date('2026-08-31'),
      batchNumber: 'OME-2025-018',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C in a dry place',
      sideEffects: ['Headache', 'Diarrhoea', 'Abdominal pain', 'Nausea'],
      contraindications: ['PPI hypersensitivity', 'Concurrent use with clopidogrel (reduces efficacy)']
    },
    {
      name: 'Domstal 10mg',
      genericName: 'Domperidone',
      manufacturer: 'Torrent Pharmaceuticals',
      category: 'Gastrointestinal',
      dosageForm: 'Tablet',
      strength: '10mg',
      unitPrice: 5.5,
      stockQuantity: 400,
      reorderLevel: 70,
      expiryDate: new Date('2027-01-31'),
      batchNumber: 'DOM-2025-019',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Dry mouth', 'Headache', 'QT prolongation (rare)', 'Galactorrhoea'],
      contraindications: ['GI perforation', 'Prolactinoma', 'Moderate-severe hepatic impairment', 'QT prolongation']
    },
    {
      name: 'Asthalin Inhaler',
      genericName: 'Salbutamol Sulphate',
      manufacturer: 'Cipla Limited',
      category: 'Respiratory',
      dosageForm: 'Inhaler',
      strength: '100mcg/dose',
      unitPrice: 140.0,
      stockQuantity: 80,
      reorderLevel: 20,
      expiryDate: new Date('2027-05-31'),
      batchNumber: 'AST-2025-020',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C. Do not refrigerate. Keep away from fire or direct sunlight.',
      sideEffects: ['Tremor', 'Palpitations', 'Tachycardia', 'Hypokalaemia (high doses)'],
      contraindications: ['Tachyarrhythmia', 'Salbutamol hypersensitivity']
    },
    {
      name: 'Montair 10mg',
      genericName: 'Montelukast Sodium',
      manufacturer: 'Cipla Limited',
      category: 'Respiratory',
      dosageForm: 'Tablet',
      strength: '10mg',
      unitPrice: 25.0,
      stockQuantity: 300,
      reorderLevel: 50,
      expiryDate: new Date('2027-04-30'),
      batchNumber: 'MON-2025-021',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C protected from light and moisture',
      sideEffects: ['Headache', 'Abdominal pain', 'Fatigue', 'Neuropsychiatric events (rare)'],
      contraindications: ['Montelukast hypersensitivity', 'Not for acute asthma attacks']
    },
    {
      name: 'Cetzine 10mg',
      genericName: 'Cetirizine Hydrochloride',
      manufacturer: 'UCB India Private Limited',
      category: 'Antihistamine',
      dosageForm: 'Tablet',
      strength: '10mg',
      unitPrice: 4.0,
      stockQuantity: 550,
      reorderLevel: 90,
      expiryDate: new Date('2027-09-30'),
      batchNumber: 'CET-2025-022',
      prescriptionRequired: false,
      storageConditions: 'Store below 30°C',
      sideEffects: ['Drowsiness', 'Dry mouth', 'Headache', 'Fatigue'],
      contraindications: ['Severe renal impairment', 'Cetirizine hypersensitivity']
    },
    {
      name: 'Lorfast 10mg',
      genericName: 'Loratadine',
      manufacturer: 'Glenmark Pharmaceuticals',
      category: 'Antihistamine',
      dosageForm: 'Tablet',
      strength: '10mg',
      unitPrice: 6.0,
      stockQuantity: 420,
      reorderLevel: 70,
      expiryDate: new Date('2027-11-30'),
      batchNumber: 'LOR-2025-023',
      prescriptionRequired: false,
      storageConditions: 'Store below 30°C in dry conditions',
      sideEffects: ['Headache', 'Somnolence', 'Dry mouth', 'Fatigue'],
      contraindications: ['Hepatic impairment (reduce frequency)', 'Loratadine hypersensitivity']
    },
    {
      name: 'Candid-B Cream',
      genericName: 'Clotrimazole + Beclomethasone Dipropionate',
      manufacturer: 'Glenmark Pharmaceuticals',
      category: 'Dermatological',
      dosageForm: 'Cream',
      strength: '1% + 0.025%',
      unitPrice: 55.0,
      stockQuantity: 150,
      reorderLevel: 30,
      expiryDate: new Date('2027-02-28'),
      batchNumber: 'CDB-2025-024',
      prescriptionRequired: true,
      storageConditions: 'Store below 30°C. Do not refrigerate.',
      sideEffects: ['Skin irritation', 'Burning sensation', 'Skin atrophy (prolonged use)', 'Striae'],
      contraindications: ['Viral skin infections', 'Open wounds', 'Hypersensitivity to components', 'Rosacea']
    },
    {
      name: 'Calcirol 60000 IU',
      genericName: 'Cholecalciferol (Vitamin D3)',
      manufacturer: 'Cadila Pharmaceuticals',
      category: 'Other',
      dosageForm: 'Capsule',
      strength: '60000 IU',
      unitPrice: 35.0,
      stockQuantity: 300,
      reorderLevel: 50,
      expiryDate: new Date('2027-08-31'),
      batchNumber: 'CAL-2025-025',
      prescriptionRequired: false,
      storageConditions: 'Store below 30°C away from light',
      sideEffects: ['Hypercalcaemia (overdose)', 'Nausea', 'Weakness', 'Polyuria'],
      contraindications: ['Hypercalcaemia', 'Hypervitaminosis D', 'Sarcoidosis', 'Nephrolithiasis']
    }
  ];

  const medicines = [];
  for (const data of medicineData) {
    const medicine = await Medicine.create(data);
    medicines.push(medicine);
    console.log(`  Created medicine: ${medicine.name} (${medicine.medicineId})`);
  }

  console.log(`Medicine seeding complete. Created ${medicines.length} medicines.\n`);
  return medicines;
}

async function seedAppointments(patients, doctors, adminUsers) {
  console.log('Seeding appointments...');

  const createdBy = adminUsers[2]._id; // Tulika Agarwal (Admin/Receptionist)

  const appointmentData = [
    // --- PAST COMPLETED APPOINTMENTS ---
    {
      patient: patients[0]._id,    // Arjun Malhotra
      doctor: doctors[0]._id,      // Dr. Keshav Iyer (Cardiology)
      appointmentDate: new Date('2026-03-10'),
      timeSlot: { startTime: '09:00', endTime: '09:30' },
      type: 'Consultation',
      status: 'Completed',
      priority: 'Normal',
      symptoms: 'Chest discomfort, shortness of breath on exertion, palpitations',
      diagnosis: 'Hypertensive Heart Disease — Stage 1. ECG showed LVH changes. Echo scheduled.',
      consultationFee: 1500,
      paid: true,
      paymentMethod: 'UPI',
      createdBy
    },
    {
      patient: patients[1]._id,    // Sneha Kapoor
      doctor: doctors[5]._id,      // Dr. Vikram Sharma (General Medicine)
      appointmentDate: new Date('2026-03-15'),
      timeSlot: { startTime: '09:00', endTime: '09:20' },
      type: 'Consultation',
      status: 'Completed',
      priority: 'Normal',
      symptoms: 'Wheezing, breathlessness, cough worse at night, triggered by cold weather',
      diagnosis: 'Bronchial Asthma — mild persistent. PEFR 75% of predicted. Inhaler technique reviewed.',
      consultationFee: 600,
      paid: true,
      paymentMethod: 'Cash',
      createdBy
    },
    {
      patient: patients[2]._id,    // Rajesh Kumar
      doctor: doctors[3]._id,      // Dr. Rajan Patel (Orthopedics)
      appointmentDate: new Date('2026-03-20'),
      timeSlot: { startTime: '08:00', endTime: '08:30' },
      type: 'Follow-up',
      status: 'Completed',
      priority: 'Normal',
      symptoms: 'Persistent right knee pain, stiffness in the morning lasting >30 minutes, difficulty climbing stairs',
      diagnosis: 'Post-arthroscopy follow-up. Mild effusion noted. Physiotherapy continued. X-ray showed grade 3 OA changes.',
      consultationFee: 1200,
      paid: true,
      paymentMethod: 'Card',
      createdBy
    },
    {
      patient: patients[4]._id,    // Aditya Singh
      doctor: doctors[5]._id,      // Dr. Vikram Sharma (General Medicine)
      appointmentDate: new Date('2026-03-25'),
      timeSlot: { startTime: '09:20', endTime: '09:40' },
      type: 'Follow-up',
      status: 'Completed',
      priority: 'Normal',
      symptoms: 'Routine diabetes follow-up. Occasional hypoglycaemic episodes at night.',
      diagnosis: 'Type 2 DM on Insulin Glargine. HbA1c 7.9%. Insulin dose adjusted — reduced to 18 units at bedtime. Dietary modifications reinforced.',
      consultationFee: 600,
      paid: true,
      paymentMethod: 'UPI',
      createdBy
    },
    {
      patient: patients[5]._id,    // Pooja Reddy
      doctor: doctors[0]._id,      // Dr. Keshav Iyer (Cardiology)
      appointmentDate: new Date('2026-04-01'),
      timeSlot: { startTime: '14:00', endTime: '14:30' },
      type: 'Consultation',
      status: 'Completed',
      priority: 'Urgent',
      symptoms: 'Severe headache, BP 170/110 mmHg at home, blurring of vision',
      diagnosis: 'Hypertensive urgency. IV labetalol administered. BP stabilised to 145/92. Medication adjusted — added Losartan 50mg.',
      consultationFee: 1500,
      paid: true,
      paymentMethod: 'Insurance',
      createdBy
    },
    {
      patient: patients[7]._id,    // Kavitha Menon
      doctor: doctors[5]._id,      // Dr. Vikram Sharma (General Medicine)
      appointmentDate: new Date('2026-04-10'),
      timeSlot: { startTime: '09:40', endTime: '10:00' },
      type: 'Follow-up',
      status: 'Completed',
      priority: 'Normal',
      symptoms: 'Joint pain and swelling bilateral hands, early morning stiffness, fatigue',
      diagnosis: 'Rheumatoid Arthritis — active disease. DAS28 score 4.2. Methotrexate dose maintained. Referred to Rheumatology.',
      consultationFee: 600,
      paid: true,
      paymentMethod: 'Cash',
      createdBy
    },
    {
      patient: patients[3]._id,    // Meera Joshi
      doctor: doctors[4]._id,      // Dr. Ananya Bose (Dermatology)
      appointmentDate: new Date('2026-04-12'),
      timeSlot: { startTime: '11:00', endTime: '11:30' },
      type: 'Consultation',
      status: 'Completed',
      priority: 'Normal',
      symptoms: 'Itchy red patches on arms and neck, worsening over 2 weeks',
      diagnosis: 'Contact Dermatitis — likely triggered by new cosmetic product. Topical corticosteroid prescribed. Allergen avoidance counselled.',
      consultationFee: 1000,
      paid: true,
      paymentMethod: 'UPI',
      createdBy
    },

    // --- FUTURE SCHEDULED / CONFIRMED APPOINTMENTS ---
    {
      patient: patients[0]._id,    // Arjun Malhotra
      doctor: doctors[0]._id,      // Dr. Keshav Iyer (Cardiology)
      appointmentDate: new Date('2026-04-28'),
      timeSlot: { startTime: '09:00', endTime: '09:30' },
      type: 'Follow-up',
      status: 'Confirmed',
      priority: 'Normal',
      symptoms: 'Follow-up for hypertensive heart disease. Echo results review.',
      consultationFee: 1500,
      paid: false,
      createdBy
    },
    {
      patient: patients[1]._id,    // Sneha Kapoor
      doctor: doctors[2]._id,      // Dr. Priya Nair (Pediatrics — referred for allergy consult)
      appointmentDate: new Date('2026-04-30'),
      timeSlot: { startTime: '10:00', endTime: '10:30' },
      type: 'Consultation',
      status: 'Scheduled',
      priority: 'Normal',
      symptoms: 'Severe allergic reaction history — seeking specialist allergy evaluation and immunotherapy options',
      consultationFee: 800,
      paid: false,
      createdBy
    },
    {
      patient: patients[6]._id,    // Rohit Gupta
      doctor: doctors[5]._id,      // Dr. Vikram Sharma (General Medicine)
      appointmentDate: new Date('2026-05-05'),
      timeSlot: { startTime: '09:00', endTime: '09:20' },
      type: 'Consultation',
      status: 'Scheduled',
      priority: 'Normal',
      symptoms: 'Persistent cold, sore throat and mild fever for 5 days, not improving',
      consultationFee: 600,
      paid: false,
      createdBy
    }
  ];

  const appointments = [];
  for (const data of appointmentData) {
    const appointment = await Appointment.create(data);
    appointments.push(appointment);
    console.log(`  Created appointment: ${appointment.appointmentId} — ${appointment.status} (${appointment.type})`);
  }

  console.log(`Appointment seeding complete. Created ${appointments.length} appointments.\n`);
  return appointments;
}

async function seedPrescriptions(patients, doctors, appointments, medicines) {
  console.log('Seeding prescriptions...');

  // Map medicines by name for easy lookup
  const medByName = {};
  for (const m of medicines) {
    medByName[m.name] = m;
  }

  const prescriptionData = [
    {
      // Prescription for Arjun Malhotra — Cardiology follow-up (appointment[0])
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      appointment: appointments[0]._id,
      medicines: [
        {
          medicine: medByName['Amlokind 5mg']._id,
          dosage: '5mg',
          frequency: 'Once daily in the morning',
          duration: '90 days',
          instructions: 'Take with or without food. Do not stop abruptly.',
          quantity: 90
        },
        {
          medicine: medByName['Storvas 20mg']._id,
          dosage: '20mg',
          frequency: 'Once daily at bedtime',
          duration: '90 days',
          instructions: 'Take at night. Avoid grapefruit juice.',
          quantity: 90
        },
        {
          medicine: medByName['Ecosprin 75mg']._id,
          dosage: '75mg',
          frequency: 'Once daily after breakfast',
          duration: '90 days',
          instructions: 'Take after food to reduce gastric irritation.',
          quantity: 90
        },
        {
          medicine: medByName['Pantocid 40mg']._id,
          dosage: '40mg',
          frequency: 'Once daily before breakfast',
          duration: '90 days',
          instructions: 'Take 30 minutes before first meal.',
          quantity: 90
        }
      ],
      diagnosis: 'Hypertensive Heart Disease — Stage 1. Dyslipidaemia.',
      symptoms: 'Chest discomfort, shortness of breath on exertion, palpitations',
      status: 'Fulfilled',
      validUntil: new Date('2026-06-10'),
      notes: 'Echo scheduled in 4 weeks. Monitor BP daily and maintain log. Low salt, low fat diet advised. Review in 3 months.'
    },
    {
      // Prescription for Sneha Kapoor — Asthma consultation (appointment[1])
      patient: patients[1]._id,
      doctor: doctors[5]._id,
      appointment: appointments[1]._id,
      medicines: [
        {
          medicine: medByName['Asthalin Inhaler']._id,
          dosage: '2 puffs (200mcg)',
          frequency: 'As needed for acute symptoms (not more than 4 times/day)',
          duration: '60 days (rescue inhaler)',
          instructions: 'Use spacer. Rinse mouth after use. Carry at all times.',
          quantity: 1
        },
        {
          medicine: medByName['Montair 10mg']._id,
          dosage: '10mg',
          frequency: 'Once daily at bedtime',
          duration: '30 days',
          instructions: 'Take consistently every night. Not to be used for acute attacks.',
          quantity: 30
        },
        {
          medicine: medByName['Cetzine 10mg']._id,
          dosage: '10mg',
          frequency: 'Once daily at bedtime',
          duration: '30 days',
          instructions: 'May cause drowsiness. Take at bedtime.',
          quantity: 30
        }
      ],
      diagnosis: 'Bronchial Asthma — mild persistent. Allergic rhinitis.',
      symptoms: 'Wheezing, breathlessness, cough worse at night',
      status: 'Fulfilled',
      validUntil: new Date('2026-05-15'),
      notes: 'Allergen avoidance — dust mite covers for bedding, avoid cold air exposure. PEFR diary to be maintained. Review in 4 weeks.'
    },
    {
      // Prescription for Rajesh Kumar — Orthopedic follow-up (appointment[2])
      patient: patients[2]._id,
      doctor: doctors[3]._id,
      appointment: appointments[2]._id,
      medicines: [
        {
          medicine: medByName['Cozaar 50mg']._id,
          dosage: '50mg',
          frequency: 'Once daily in the morning',
          duration: '90 days',
          instructions: 'Take at same time each day. Monitor blood pressure weekly.',
          quantity: 90
        },
        {
          medicine: medByName['Voveran 50mg']._id,
          dosage: '50mg',
          frequency: 'Twice daily after meals',
          duration: '14 days',
          instructions: 'Take after food. Avoid if stomach upset.',
          quantity: 28
        },
        {
          medicine: medByName['Pantocid 40mg']._id,
          dosage: '40mg',
          frequency: 'Once daily before breakfast',
          duration: '14 days',
          instructions: 'Take with Voveran to protect stomach lining.',
          quantity: 14
        },
        {
          medicine: medByName['Calcirol 60000 IU']._id,
          dosage: '60000 IU',
          frequency: 'Once weekly',
          duration: '12 weeks',
          instructions: 'Take with fatty meal for better absorption.',
          quantity: 12
        }
      ],
      diagnosis: 'Post-arthroscopy right knee. Osteoarthritis Grade 3. Essential Hypertension.',
      symptoms: 'Right knee pain, morning stiffness, difficulty on stairs',
      status: 'Fulfilled',
      validUntil: new Date('2026-06-20'),
      notes: 'Physiotherapy 3 times/week. Weight reduction target: 5kg. Knee strengthening exercises. Avoid high-impact activities. Review in 3 months.'
    },
    {
      // Prescription for Aditya Singh — Diabetes follow-up (appointment[3])
      patient: patients[4]._id,
      doctor: doctors[5]._id,
      appointment: appointments[3]._id,
      medicines: [
        {
          medicine: medByName['Lantus']._id,
          dosage: '18 units',
          frequency: 'Once daily at bedtime (subcutaneous injection)',
          duration: '90 days',
          instructions: 'Inject subcutaneously in abdomen, thigh, or upper arm. Rotate injection sites. Refrigerate unopened vials.',
          quantity: 3
        },
        {
          medicine: medByName['Glucophage 500mg']._id,
          dosage: '500mg',
          frequency: 'Twice daily with meals',
          duration: '90 days',
          instructions: 'Take with food to reduce GI side effects. Do not crush or chew.',
          quantity: 180
        }
      ],
      diagnosis: 'Type 2 Diabetes Mellitus — insulin-dependent. HbA1c 7.9%. Nocturnal hypoglycaemia.',
      symptoms: 'Routine follow-up, occasional nocturnal hypoglycaemic episodes',
      status: 'Pending',
      validUntil: new Date('2026-06-25'),
      notes: 'HbA1c target <7%. Check blood glucose before bedtime — if <100 mg/dL, reduce insulin. Dietary consultation advised. Review in 3 months.'
    },
    {
      // Prescription for Pooja Reddy — Hypertensive urgency (appointment[4])
      patient: patients[5]._id,
      doctor: doctors[0]._id,
      appointment: appointments[4]._id,
      medicines: [
        {
          medicine: medByName['Amlokind 5mg']._id,
          dosage: '5mg',
          frequency: 'Once daily in the morning',
          duration: '90 days',
          instructions: 'Take at the same time each day. Do not stop without consulting doctor.',
          quantity: 90
        },
        {
          medicine: medByName['Cozaar 50mg']._id,
          dosage: '50mg',
          frequency: 'Once daily in the morning',
          duration: '90 days',
          instructions: 'Take with or without food. Monitor serum potassium.',
          quantity: 90
        },
        {
          medicine: medByName['Pantocid 40mg']._id,
          dosage: '40mg',
          frequency: 'Once daily before breakfast',
          duration: '30 days',
          instructions: 'Gastric protection — take 30 minutes before meal.',
          quantity: 30
        }
      ],
      diagnosis: 'Hypertensive urgency (BP 170/110 mmHg). Essential Hypertension on treatment. Hypothyroidism.',
      symptoms: 'Severe headache, blurred vision, high BP at home',
      status: 'Fulfilled',
      validUntil: new Date('2026-07-01'),
      notes: 'Continue Levothyroxine as per current prescription. No NSAIDs. Monitor BP twice daily and maintain log. ER visit if BP >180/120 or neurological symptoms. Review in 4 weeks.'
    }
  ];

  const prescriptions = [];
  for (const data of prescriptionData) {
    const prescription = await Prescription.create(data);
    prescriptions.push(prescription);
    console.log(`  Created prescription: ${prescription.prescriptionId} — Status: ${prescription.status}`);
  }

  console.log(`Prescription seeding complete. Created ${prescriptions.length} prescriptions.\n`);
  return prescriptions;
}

async function seedBilling(patients, adminUsers) {
  console.log('Seeding billing records...');

  const generatedBy = adminUsers[2]._id; // Tulika Agarwal

  const billingData = [
    {
      // Bill 1: Arjun Malhotra — Cardiology consultation — PAID
      patient: patients[0]._id,
      billType: 'Consultation',
      createdByRole: 'Receptionist',
      billDate: new Date('2026-03-10'),
      items: [
        { description: 'Cardiology Consultation — Dr. Keshav Iyer', category: 'Consultation', quantity: 1, unitPrice: 1500, amount: 1500 },
        { description: 'ECG — Resting 12-lead', category: 'Lab Test', quantity: 1, unitPrice: 300, amount: 300 },
        { description: 'Amlokind 5mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 5, amount: 450 },
        { description: 'Storvas 20mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 18, amount: 1620 },
        { description: 'Ecosprin 75mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 2, amount: 180 },
        { description: 'Pantocid 40mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 10, amount: 900 }
      ],
      subtotal: 4950,
      discount: 250,
      tax: 0,
      totalAmount: 4700,
      amountPaid: 4700,
      balance: 0,
      paymentStatus: 'Paid',
      paymentMethod: 'UPI',
      generatedBy,
      notes: 'UPI transaction reference: UPI-2026031012345. Echo scheduled for follow-up visit.'
    },
    {
      // Bill 2: Sneha Kapoor — Pharmacy bill (Asthma medicines) — PAID
      patient: patients[1]._id,
      billType: 'Pharmacy',
      createdByRole: 'Pharmacist',
      billDate: new Date('2026-03-15'),
      items: [
        { description: 'General Medicine Consultation — Dr. Vikram Sharma', category: 'Consultation', quantity: 1, unitPrice: 600, amount: 600 },
        { description: 'Peak Flow Meter Reading (PEFR)', category: 'Lab Test', quantity: 1, unitPrice: 150, amount: 150 },
        { description: 'Asthalin Inhaler x 1', category: 'Medicine', quantity: 1, unitPrice: 140, amount: 140 },
        { description: 'Montair 10mg x 30 tablets', category: 'Medicine', quantity: 30, unitPrice: 25, amount: 750 },
        { description: 'Cetzine 10mg x 30 tablets', category: 'Medicine', quantity: 30, unitPrice: 4, amount: 120 }
      ],
      subtotal: 1760,
      discount: 0,
      tax: 0,
      totalAmount: 1760,
      amountPaid: 1760,
      balance: 0,
      paymentStatus: 'Paid',
      paymentMethod: 'Cash',
      generatedBy,
      notes: 'Cash payment received. Receipt issued.'
    },
    {
      // Bill 3: Rajesh Kumar — Orthopedic consultation — PAID
      patient: patients[2]._id,
      billType: 'Consultation',
      createdByRole: 'Receptionist',
      billDate: new Date('2026-03-20'),
      items: [
        { description: 'Orthopedic Consultation — Dr. Rajan Patel', category: 'Consultation', quantity: 1, unitPrice: 1200, amount: 1200 },
        { description: 'X-Ray Right Knee (AP + Lateral Views)', category: 'Imaging', quantity: 1, unitPrice: 600, amount: 600 },
        { description: 'Physiotherapy Session (1st)', category: 'Other', quantity: 1, unitPrice: 400, amount: 400 },
        { description: 'Cozaar 50mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 22, amount: 1980 },
        { description: 'Voveran 50mg x 28 tablets', category: 'Medicine', quantity: 28, unitPrice: 6.5, amount: 182 },
        { description: 'Pantocid 40mg x 14 tablets', category: 'Medicine', quantity: 14, unitPrice: 10, amount: 140 },
        { description: 'Calcirol 60000 IU x 12 capsules', category: 'Medicine', quantity: 12, unitPrice: 35, amount: 420 }
      ],
      subtotal: 4922,
      discount: 422,
      tax: 0,
      totalAmount: 4500,
      amountPaid: 4500,
      balance: 0,
      paymentStatus: 'Paid',
      paymentMethod: 'Card',
      generatedBy,
      notes: 'Card payment — HDFC Visa ending 4521. Physio package: 10 sessions included.'
    },
    {
      // Bill 4: Aditya Singh — Lab tests (Diabetes follow-up) — PARTIALLY PAID
      patient: patients[4]._id,
      billType: 'Test',
      createdByRole: 'Receptionist',
      billDate: new Date('2026-03-25'),
      items: [
        { description: 'General Medicine Consultation — Dr. Vikram Sharma', category: 'Consultation', quantity: 1, unitPrice: 600, amount: 600 },
        { description: 'HbA1c Test', category: 'Lab Test', quantity: 1, unitPrice: 700, amount: 700 },
        { description: 'Fasting Blood Glucose', category: 'Lab Test', quantity: 1, unitPrice: 150, amount: 150 },
        { description: 'Renal Function Test', category: 'Lab Test', quantity: 1, unitPrice: 500, amount: 500 },
        { description: 'Lantus Insulin x 3 vials', category: 'Medicine', quantity: 3, unitPrice: 850, amount: 2550 },
        { description: 'Glucophage 500mg x 180 tablets', category: 'Medicine', quantity: 180, unitPrice: 4.5, amount: 810 }
      ],
      subtotal: 5310,
      discount: 310,
      tax: 0,
      totalAmount: 5000,
      amountPaid: 2500,
      balance: 2500,
      paymentStatus: 'Partially-Paid',
      paymentMethod: 'UPI',
      generatedBy,
      notes: 'Partial payment of Rs. 2500 received via UPI. Balance Rs. 2500 due within 7 days. Patient informed.'
    },
    {
      // Bill 5: Pooja Reddy — Hypertensive urgency consultation — PAID by Insurance
      patient: patients[5]._id,
      billType: 'Consultation',
      createdByRole: 'Receptionist',
      billDate: new Date('2026-04-01'),
      items: [
        { description: 'Cardiology Consultation — Dr. Keshav Iyer (Urgent)', category: 'Consultation', quantity: 1, unitPrice: 1500, amount: 1500 },
        { description: 'Emergency Observation Charges (4 hours)', category: 'Emergency', quantity: 1, unitPrice: 2000, amount: 2000 },
        { description: 'IV Labetalol Administration', category: 'Emergency', quantity: 1, unitPrice: 800, amount: 800 },
        { description: 'BP Monitoring (continuous, 4 hours)', category: 'Other', quantity: 1, unitPrice: 300, amount: 300 },
        { description: 'CT Brain (non-contrast)', category: 'Imaging', quantity: 1, unitPrice: 3500, amount: 3500 },
        { description: 'Amlokind 5mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 5, amount: 450 },
        { description: 'Cozaar 50mg x 90 tablets', category: 'Medicine', quantity: 90, unitPrice: 22, amount: 1980 },
        { description: 'Pantocid 40mg x 30 tablets', category: 'Medicine', quantity: 30, unitPrice: 10, amount: 300 }
      ],
      subtotal: 10830,
      discount: 830,
      tax: 0,
      totalAmount: 10000,
      amountPaid: 10000,
      balance: 0,
      paymentStatus: 'Paid',
      paymentMethod: 'Insurance',
      generatedBy,
      notes: 'Insurance claim — National Insurance Policy No. NIC-POL-2024-88712. Claim approved and settled. CT Brain: No acute intracranial pathology.'
    },
    {
      // Bill 6: Meera Joshi — Dermatology consultation — UNPAID
      patient: patients[3]._id,
      billType: 'Consultation',
      createdByRole: 'Receptionist',
      billDate: new Date('2026-04-12'),
      items: [
        { description: 'Dermatology Consultation — Dr. Ananya Bose', category: 'Consultation', quantity: 1, unitPrice: 1000, amount: 1000 },
        { description: 'Patch Test (allergen panel 10 allergens)', category: 'Lab Test', quantity: 1, unitPrice: 1200, amount: 1200 },
        { description: 'Candid-B Cream x 2 tubes', category: 'Medicine', quantity: 2, unitPrice: 55, amount: 110 }
      ],
      subtotal: 2310,
      discount: 110,
      tax: 0,
      totalAmount: 2200,
      amountPaid: 0,
      balance: 2200,
      paymentStatus: 'Unpaid',
      generatedBy,
      notes: 'Payment due. Patient to pay at next visit or via online portal. Bill validity: 30 days.'
    }
  ];

  const bills = [];
  for (const data of billingData) {
    const bill = await Billing.create(data);
    bills.push(bill);
    console.log(`  Created bill: ${bill.billNumber} — ${bill.paymentStatus} (Rs. ${bill.totalAmount})`);
  }

  console.log(`Billing seeding complete. Created ${bills.length} billing records.\n`);
  return bills;
}

function printSummary(admins, doctorProfiles, patientProfiles, staffProfiles, wards, medicines, appointments, prescriptions, bills) {
  console.log('='.repeat(70));
  console.log('                     SEED SUMMARY');
  console.log('='.repeat(70));

  console.log('\n--- ADMIN CREDENTIALS ---');
  const adminCreds = [
    { name: 'Kanan Mehta',    email: 'kanan.admin@medilink.com',   password: 'Admin@123' },
    { name: 'Kanishk Sharma', email: 'kanishk.admin@medilink.com', password: 'Admin@123' },
    { name: 'Tulika Agarwal', email: 'tulika.admin@medilink.com',  password: 'Admin@123' }
  ];
  for (const c of adminCreds) {
    console.log(`  ${c.name.padEnd(20)} | ${c.email.padEnd(35)} | ${c.password}`);
  }

  console.log('\n--- DOCTOR CREDENTIALS ---');
  const docCreds = [
    { name: 'Dr. Keshav Iyer',   email: 'keshav.iyer@medilink.com',   spec: 'Cardiology',      fee: 1500 },
    { name: 'Dr. Manik Verma',   email: 'manik.verma@medilink.com',   spec: 'Neurology',       fee: 2000 },
    { name: 'Dr. Priya Nair',    email: 'priya.nair@medilink.com',    spec: 'Pediatrics',      fee: 800  },
    { name: 'Dr. Rajan Patel',   email: 'rajan.patel@medilink.com',   spec: 'Orthopedics',     fee: 1200 },
    { name: 'Dr. Ananya Bose',   email: 'ananya.bose@medilink.com',   spec: 'Dermatology',     fee: 1000 },
    { name: 'Dr. Vikram Sharma', email: 'vikram.sharma@medilink.com', spec: 'General Medicine', fee: 600  }
  ];
  for (const c of docCreds) {
    console.log(`  ${c.name.padEnd(22)} | ${c.email.padEnd(35)} | Doctor@123 | ${c.spec} | Rs.${c.fee}`);
  }

  console.log('\n--- PATIENT CREDENTIALS ---');
  const patCreds = [
    { name: 'Arjun Malhotra',  email: 'arjun.malhotra@gmail.com',  id: 'PAT000001', blood: 'B+',  conditions: 'Hypertension + T2DM' },
    { name: 'Sneha Kapoor',    email: 'sneha.kapoor@gmail.com',    id: 'PAT000002', blood: 'A+',  conditions: 'Bronchial Asthma' },
    { name: 'Rajesh Kumar',    email: 'rajesh.kumar@gmail.com',    id: 'PAT000003', blood: 'O+',  conditions: 'Knee OA + Hypertension' },
    { name: 'Meera Joshi',     email: 'meera.joshi@gmail.com',     id: 'PAT000004', blood: 'AB+', conditions: 'No significant history' },
    { name: 'Aditya Singh',    email: 'aditya.singh@gmail.com',    id: 'PAT000005', blood: 'B-',  conditions: 'T2DM (insulin-dependent)' },
    { name: 'Pooja Reddy',     email: 'pooja.reddy@gmail.com',     id: 'PAT000006', blood: 'O-',  conditions: 'Hypertension + Hypothyroidism' },
    { name: 'Rohit Gupta',     email: 'rohit.gupta@gmail.com',     id: 'PAT000007', blood: 'A-',  conditions: 'None' },
    { name: 'Kavitha Menon',   email: 'kavitha.menon@gmail.com',   id: 'PAT000008', blood: 'AB-', conditions: 'RA + Hypertension' }
  ];
  for (const c of patCreds) {
    console.log(`  ${c.name.padEnd(18)} | ${c.email.padEnd(35)} | Patient@123 | ${c.id} | ${c.blood} | ${c.conditions}`);
  }

  console.log('\n--- STAFF CREDENTIALS ---');
  const staffCreds = [
    { name: 'Tulika Sharma', email: 'tulika.sharma@medilink.com', role: 'Nurse',         dept: 'Cardiology' },
    { name: 'Sunita Rao',    email: 'sunita.rao@medilink.com',    role: 'Nurse',         dept: 'General Medicine' },
    { name: 'Kanan Jain',    email: 'kanan.jain@medilink.com',    role: 'Receptionist',  dept: 'Administration' },
    { name: 'Neha Gupta',    email: 'neha.gupta@medilink.com',    role: 'Receptionist',  dept: 'Administration' },
    { name: 'Manik Shukla',  email: 'manik.shukla@medilink.com', role: 'Pharmacist',    dept: 'Pharmacy' }
  ];
  for (const c of staffCreds) {
    console.log(`  ${c.name.padEnd(16)} | ${c.email.padEnd(35)} | Staff@123 | ${c.role} | ${c.dept}`);
  }

  console.log('\n--- COLLECTION COUNTS ---');
  console.log(`  Admins:        ${admins.length}`);
  console.log(`  Doctors:       ${doctorProfiles.length}`);
  console.log(`  Patients:      ${patientProfiles.length}`);
  console.log(`  Staff:         ${staffProfiles.length}`);
  console.log(`  Wards:         ${wards.length}`);
  console.log(`  Medicines:     ${medicines.length}`);
  console.log(`  Appointments:  ${appointments.length}`);
  console.log(`  Prescriptions: ${prescriptions.length}`);
  console.log(`  Bills:         ${bills.length}`);

  console.log('\n--- WARD OVERVIEW ---');
  const wardInfo = [
    { name: 'General Ward A',         number: 'WARD-GEN-A',  total: 20, available: 13, rate: 1500 },
    { name: 'Intensive Care Unit',    number: 'WARD-ICU-01', total: 8,  available: 3,  rate: 8000 },
    { name: 'Private Ward',           number: 'WARD-PVT-01', total: 10, available: 6,  rate: 4500 },
    { name: 'Emergency Ward',         number: 'WARD-EMG-01', total: 12, available: 7,  rate: 3000 },
    { name: 'Pediatric Ward',         number: 'WARD-PED-01', total: 15, available: 11, rate: 2000 }
  ];
  for (const w of wardInfo) {
    console.log(`  ${w.name.padEnd(24)} | ${w.number.padEnd(14)} | ${w.total} beds | ${w.available} available | Rs.${w.rate}/day`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  Seeding complete! Medilink database is ready.');
  console.log('='.repeat(70) + '\n');
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('           MEDILINK DATABASE SEEDER');
    console.log('='.repeat(70) + '\n');

    console.log(`Connecting to MongoDB: ${process.env.MONGO_URI ? process.env.MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : '(MONGO_URI not set)'}\n`);

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    if (shouldReset) {
      await clearCollections();
    } else {
      console.log('(No --reset flag provided. Skipping collection clear. Use --reset to wipe existing data first.)\n');
    }

    // 1. Seed admins (returns User documents)
    const admins = await seedAdmins();

    // 2. Seed doctors (returns Doctor documents)
    const doctorProfiles = await seedDoctors();

    // Fetch all Doctor documents so we have their _ids reliably
    const doctors = await Doctor.find().lean();

    // 3. Seed patients (returns Patient documents)
    const patientProfiles = await seedPatients();

    // Fetch all Patient documents so we have their _ids reliably
    const patients = await Patient.find().lean();

    // 4. Seed staff
    const staffProfiles = await seedStaff(admins);

    // 5. Seed wards
    const wards = await seedWards();

    // 6. Seed medicines
    const medicines = await seedMedicines();

    // 7. Seed appointments
    const appointments = await seedAppointments(patients, doctors, admins);

    // Fetch all Appointment documents
    const allAppointments = await Appointment.find().sort({ createdAt: 1 }).lean();

    // 8. Seed prescriptions
    const prescriptions = await seedPrescriptions(patients, doctors, allAppointments, medicines);

    // 9. Seed billing
    const bills = await seedBilling(patients, admins);

    // Print summary
    printSummary(admins, doctorProfiles, patientProfiles, staffProfiles, wards, medicines, allAppointments, prescriptions, bills);

  } catch (error) {
    console.error('\nSeeding failed with error:');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();

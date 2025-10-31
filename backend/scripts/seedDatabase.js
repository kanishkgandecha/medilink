const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Inventory = require('../models/Inventory');
const Ward = require('../models/Ward');
const Prescription = require('../models/Prescription');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Doctor.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await Inventory.deleteMany({});
    await Ward.deleteMany({});
    await Prescription.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Admin User
    const adminUser = await User.create({
      email: 'admin@hospital.com',
      password: 'Admin@123',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '9876543210',
      status: 'active',
    });
    console.log('✅ Admin user created');

    // Create Doctors
    const doctorUsers = await User.create([
      {
        email: 'dr.smith@hospital.com',
        password: 'Doctor@123',
        role: 'doctor',
        firstName: 'John',
        lastName: 'Smith',
        phoneNumber: '9876543211',
        status: 'active',
      },
      {
        email: 'dr.jones@hospital.com',
        password: 'Doctor@123',
        role: 'doctor',
        firstName: 'Sarah',
        lastName: 'Jones',
        phoneNumber: '9876543212',
        status: 'active',
      },
      {
        email: 'dr.patel@hospital.com',
        password: 'Doctor@123',
        role: 'doctor',
        firstName: 'Rajesh',
        lastName: 'Patel',
        phoneNumber: '9876543213',
        status: 'active',
      },
    ]);

    const doctors = await Doctor.create([
      {
        userId: doctorUsers[0]._id,
        specialization: 'Cardiology',
        qualification: 'MBBS, MD (Cardiology)',
        experience: 15,
        licenseNumber: 'MED123456',
        consultationFee: 1500,
        availability: [
          {
            day: 'Monday',
            timeSlots: [{ startTime: '09:00', endTime: '17:00', maxPatients: 10 }],
          },
          {
            day: 'Wednesday',
            timeSlots: [{ startTime: '09:00', endTime: '17:00', maxPatients: 10 }],
          },
          {
            day: 'Friday',
            timeSlots: [{ startTime: '09:00', endTime: '17:00', maxPatients: 10 }],
          },
        ],
        department: 'Cardiology',
        rating: 4.8,
      },
      {
        userId: doctorUsers[1]._id,
        specialization: 'Neurology',
        qualification: 'MBBS, MD (Neurology)',
        experience: 12,
        licenseNumber: 'MED123457',
        consultationFee: 1800,
        availability: [
          {
            day: 'Tuesday',
            timeSlots: [{ startTime: '10:00', endTime: '16:00', maxPatients: 8 }],
          },
          {
            day: 'Thursday',
            timeSlots: [{ startTime: '10:00', endTime: '16:00', maxPatients: 8 }],
          },
        ],
        department: 'Neurology',
        rating: 4.7,
      },
      {
        userId: doctorUsers[2]._id,
        specialization: 'Pediatrics',
        qualification: 'MBBS, DCH',
        experience: 10,
        licenseNumber: 'MED123458',
        consultationFee: 1200,
        availability: [
          {
            day: 'Monday',
            timeSlots: [{ startTime: '09:00', endTime: '14:00', maxPatients: 15 }],
          },
          {
            day: 'Wednesday',
            timeSlots: [{ startTime: '09:00', endTime: '14:00', maxPatients: 15 }],
          },
          {
            day: 'Friday',
            timeSlots: [{ startTime: '09:00', endTime: '14:00', maxPatients: 15 }],
          },
        ],
        department: 'Pediatrics',
        rating: 4.9,
      },
    ]);

    // Update doctor users with profile references
    await User.findByIdAndUpdate(doctorUsers[0]._id, { profileRef: doctors[0]._id });
    await User.findByIdAndUpdate(doctorUsers[1]._id, { profileRef: doctors[1]._id });
    await User.findByIdAndUpdate(doctorUsers[2]._id, { profileRef: doctors[2]._id });
    console.log('✅ Doctors created');

    // Create Patients
    const patientUsers = await User.create([
      {
        email: 'patient1@gmail.com',
        password: 'Patient@123',
        role: 'patient',
        firstName: 'Michael',
        lastName: 'Brown',
        phoneNumber: '9876543214',
        status: 'active',
      },
      {
        email: 'patient2@gmail.com',
        password: 'Patient@123',
        role: 'patient',
        firstName: 'Emily',
        lastName: 'Davis',
        phoneNumber: '9876543215',
        status: 'active',
      },
      {
        email: 'patient3@gmail.com',
        password: 'Patient@123',
        role: 'patient',
        firstName: 'James',
        lastName: 'Wilson',
        phoneNumber: '9876543216',
        status: 'active',
      },
      {
        email: 'patient4@gmail.com',
        password: 'Patient@123',
        role: 'patient',
        firstName: 'Sophia',
        lastName: 'Martinez',
        phoneNumber: '9876543217',
        status: 'active',
      },
      {
        email: 'patient5@gmail.com',
        password: 'Patient@123',
        role: 'patient',
        firstName: 'Oliver',
        lastName: 'Garcia',
        phoneNumber: '9876543218',
        status: 'active',
      },
    ]);

    const patients = await Patient.create([
      {
        userId: patientUsers[0]._id,
        dateOfBirth: new Date('1985-05-15'),
        gender: 'Male',
        bloodGroup: 'O+',
        allergies: ['Penicillin'],
        medicalHistory: [
          {
            condition: 'Hypertension',
            diagnosedDate: new Date('2020-01-15'),
            status: 'chronic',
            notes: 'Under medication',
          },
        ],
      },
      {
        userId: patientUsers[1]._id,
        dateOfBirth: new Date('1990-08-22'),
        gender: 'Female',
        bloodGroup: 'A+',
        allergies: [],
        medicalHistory: [],
      },
      {
        userId: patientUsers[2]._id,
        dateOfBirth: new Date('1975-12-10'),
        gender: 'Male',
        bloodGroup: 'B+',
        allergies: ['Aspirin'],
        medicalHistory: [
          {
            condition: 'Diabetes Type 2',
            diagnosedDate: new Date('2018-06-20'),
            status: 'chronic',
            notes: 'Insulin dependent',
          },
        ],
      },
      {
        userId: patientUsers[3]._id,
        dateOfBirth: new Date('2010-03-05'),
        gender: 'Female',
        bloodGroup: 'AB+',
        allergies: [],
        medicalHistory: [],
      },
      {
        userId: patientUsers[4]._id,
        dateOfBirth: new Date('1995-07-18'),
        gender: 'Male',
        bloodGroup: 'O-',
        allergies: [],
        medicalHistory: [],
      },
    ]);

    // Update patient users with profile references
    for (let i = 0; i < patientUsers.length; i++) {
      await User.findByIdAndUpdate(patientUsers[i]._id, { profileRef: patients[i]._id });
    }
    console.log('✅ Patients created');

    // Create Inventory
    await Inventory.create([
      {
        itemName: 'Paracetamol 500mg',
        category: 'medicine',
        genericName: 'Acetaminophen',
        manufacturer: 'PharmaCorp',
        batchNumber: 'BATCH001',
        quantity: 500,
        unitPrice: 2,
        reorderLevel: 100,
        expiryDate: new Date('2026-12-31'),
        location: { building: 'A', room: '101', shelf: 'S1' },
      },
      {
        itemName: 'Amoxicillin 250mg',
        category: 'medicine',
        genericName: 'Amoxicillin',
        manufacturer: 'MediLife',
        batchNumber: 'BATCH002',
        quantity: 300,
        unitPrice: 5,
        reorderLevel: 80,
        expiryDate: new Date('2026-06-30'),
        location: { building: 'A', room: '101', shelf: 'S2' },
      },
      {
        itemName: 'Insulin Glargine',
        category: 'medicine',
        genericName: 'Insulin',
        manufacturer: 'DiabetesCare',
        batchNumber: 'BATCH003',
        quantity: 50,
        unitPrice: 500,
        reorderLevel: 20,
        expiryDate: new Date('2026-03-31'),
        location: { building: 'A', room: '102', shelf: 'S1' },
      },
      {
        itemName: 'Blood Pressure Monitor',
        category: 'equipment',
        manufacturer: 'MedEquip',
        batchNumber: 'EQ001',
        quantity: 15,
        unitPrice: 2500,
        reorderLevel: 5,
        location: { building: 'B', room: '201', shelf: 'E1' },
      },
      {
        itemName: 'Thermometer Digital',
        category: 'equipment',
        manufacturer: 'TempTech',
        batchNumber: 'EQ002',
        quantity: 50,
        unitPrice: 150,
        reorderLevel: 10,
        location: { building: 'B', room: '201', shelf: 'E2' },
      },
    ]);
    console.log('✅ Inventory items created');

    // Create Wards
    await Ward.create([
      {
        wardNumber: 'W101',
        wardType: 'general',
        floor: 1,
        building: 'A',
        totalBeds: 20,
        availableBeds: 20,
        genderPreference: 'male',
        facilities: ['AC', 'TV', 'Wifi'],
        status: 'active',
      },
      {
        wardNumber: 'W102',
        wardType: 'general',
        floor: 1,
        building: 'A',
        totalBeds: 20,
        availableBeds: 20,
        genderPreference: 'female',
        facilities: ['AC', 'TV', 'Wifi'],
        status: 'active',
      },
      {
        wardNumber: 'W201',
        wardType: 'private',
        floor: 2,
        building: 'A',
        totalBeds: 10,
        availableBeds: 10,
        genderPreference: 'mixed',
        facilities: ['AC', 'TV', 'Wifi', 'Attached Bathroom'],
        status: 'active',
      },
      {
        wardNumber: 'ICU01',
        wardType: 'ICU',
        floor: 3,
        building: 'B',
        totalBeds: 8,
        availableBeds: 8,
        genderPreference: 'mixed',
        facilities: ['Ventilator', 'Monitor', 'AC'],
        status: 'active',
      },
      {
        wardNumber: 'PED01',
        wardType: 'pediatric',
        floor: 2,
        building: 'B',
        totalBeds: 15,
        availableBeds: 15,
        genderPreference: 'mixed',
        facilities: ['Play Area', 'AC', 'TV'],
        status: 'active',
      },
    ]);
    console.log('✅ Wards created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('Admin: admin@hospital.com / Admin@123');
    console.log('Doctor: dr.smith@hospital.com / Doctor@123');
    console.log('Patient: patient1@gmail.com / Patient@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();


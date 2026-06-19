/**
 * MediLink — Complete Seed Script
 * Clears all collections and inserts realistic demo data (Indian context).
 * Run:  node seed-complete.js
 */

'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

// ─── Models ───────────────────────────────────────────────────────────────────
const User         = require('./models/User');
const Doctor       = require('./models/Doctor');
const Staff        = require('./models/Staff');
const Patient      = require('./models/Patient');
const Appointment  = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Medicine     = require('./models/Medicine');
const Billing      = require('./models/Billing');
const Ward         = require('./models/Ward');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hash    = (pw) => pw; // pre-save hook in User model handles bcrypt hashing
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysAhead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randN = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Time slot helpers ────────────────────────────────────────────────────────
const SLOT_PAIRS = [
  ['09:00', '09:30'], ['09:30', '10:00'], ['10:00', '10:30'], ['10:30', '11:00'],
  ['11:00', '11:30'], ['11:30', '12:00'], ['14:00', '14:30'], ['14:30', '15:00'],
  ['15:00', '15:30'], ['15:30', '16:00'], ['16:00', '16:30'],
];
const pickSlot = () => rand(SLOT_PAIRS);

// ─── Bill number helper ───────────────────────────────────────────────────────
let billSeq = 1;
const billNum = () => {
  const d = new Date();
  return `BILL-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}-${String(billSeq++).padStart(4,'0')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const AVAILABILITY = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => ({
  day,
  slots: [
    { startTime: '09:00', endTime: '12:00', isAvailable: true },
    { startTime: '14:00', endTime: '17:00', isAvailable: true },
  ]
}));

// ── 1. Demo + extra doctor user data ─────────────────────────────────────────
const DOCTOR_USERS = [
  // Demo
  { name: 'Dr. Arjun Sharma',    email: 'doctor@medilink.com',        pw: 'doctor123',  phone: '9876543210', dob: new Date('1975-04-12'), gender: 'Male',   city: 'Mumbai' },
  // Additional
  { name: 'Dr. Priya Verma',     email: 'priya.verma@medilink.com',   pw: 'pass1234',   phone: '9876543211', dob: new Date('1980-06-22'), gender: 'Female', city: 'Delhi' },
  { name: 'Dr. Keshav Malhotra', email: 'keshav.m@medilink.com',      pw: 'pass1234',   phone: '9876543212', dob: new Date('1972-09-05'), gender: 'Male',   city: 'Bangalore' },
  { name: 'Dr. Aarav Patel',     email: 'aarav.p@medilink.com',       pw: 'pass1234',   phone: '9876543213', dob: new Date('1983-01-17'), gender: 'Male',   city: 'Ahmedabad' },
  { name: 'Dr. Neha Gupta',      email: 'neha.g@medilink.com',        pw: 'pass1234',   phone: '9876543214', dob: new Date('1985-03-28'), gender: 'Female', city: 'Pune' },
  { name: 'Dr. Rohan Khanna',    email: 'rohan.k@medilink.com',       pw: 'pass1234',   phone: '9876543215', dob: new Date('1978-11-14'), gender: 'Male',   city: 'Chennai' },
  { name: 'Dr. Sunita Rao',      email: 'sunita.r@medilink.com',      pw: 'pass1234',   phone: '9876543216', dob: new Date('1981-07-09'), gender: 'Female', city: 'Hyderabad' },
  { name: 'Dr. Manik Chandra',   email: 'manik.c@medilink.com',       pw: 'pass1234',   phone: '9876543217', dob: new Date('1976-02-25'), gender: 'Male',   city: 'Kolkata' },
  { name: 'Dr. Anjali Singh',    email: 'anjali.s@medilink.com',      pw: 'pass1234',   phone: '9876543218', dob: new Date('1987-05-30'), gender: 'Female', city: 'Jaipur' },
  { name: 'Dr. Vikram Nair',     email: 'vikram.n@medilink.com',      pw: 'pass1234',   phone: '9876543219', dob: new Date('1979-08-19'), gender: 'Male',   city: 'Kochi' },
  { name: 'Dr. Kavita Iyer',     email: 'kavita.i@medilink.com',      pw: 'pass1234',   phone: '9876543220', dob: new Date('1982-12-03'), gender: 'Female', city: 'Coimbatore' },
  { name: 'Dr. Rahul Bose',      email: 'rahul.b@medilink.com',       pw: 'pass1234',   phone: '9876543221', dob: new Date('1974-10-07'), gender: 'Male',   city: 'Bhopal' },
  { name: 'Dr. Deepa Menon',     email: 'deepa.m@medilink.com',       pw: 'pass1234',   phone: '9876543222', dob: new Date('1986-04-16'), gender: 'Female', city: 'Trivandrum' },
];

// Doctor profiles (parallel to DOCTOR_USERS)
const DOCTOR_PROFILES = [
  { spec: 'Cardiologist',       qual: 'MD, DM Cardiology',           exp: 18, lic: 'KA/MED/2006/001', dept: 'Cardiology',       fee: 1200, rating: 4.8 },
  { spec: 'General Physician',  qual: 'MBBS, MD (General Medicine)',  exp: 13, lic: 'DL/MED/2010/002', dept: 'General Medicine', fee: 600,  rating: 4.6 },
  { spec: 'Neurologist',        qual: 'MD, DM Neurology',             exp: 21, lic: 'KA/MED/2002/003', dept: 'Neurology',        fee: 1500, rating: 4.9 },
  { spec: 'Orthopedic Surgeon', qual: 'MBBS, MS Orthopaedics',        exp: 15, lic: 'GJ/MED/2008/004', dept: 'Orthopedics',      fee: 1000, rating: 4.7 },
  { spec: 'Dermatologist',      qual: 'MBBS, MD Dermatology',         exp: 12, lic: 'MH/MED/2011/005', dept: 'Dermatology',      fee: 800,  rating: 4.5 },
  { spec: 'Pediatrician',       qual: 'MBBS, MD Pediatrics',          exp: 16, lic: 'TN/MED/2007/006', dept: 'Pediatrics',       fee: 700,  rating: 4.8 },
  { spec: 'Gastroenterologist', qual: 'MD, DM Gastroenterology',      exp: 14, lic: 'TS/MED/2009/007', dept: 'Gastroenterology', fee: 1100, rating: 4.6 },
  { spec: 'General Physician',  qual: 'MBBS, MD (General Medicine)',  exp: 22, lic: 'WB/MED/2001/008', dept: 'General Medicine', fee: 500,  rating: 4.7 },
  { spec: 'Dermatologist',      qual: 'MBBS, DNB Dermatology',        exp: 11, lic: 'RJ/MED/2012/009', dept: 'Dermatology',      fee: 750,  rating: 4.4 },
  { spec: 'Cardiologist',       qual: 'MD, DM Cardiology',           exp: 19, lic: 'KL/MED/2004/010', dept: 'Cardiology',       fee: 1300, rating: 4.9 },
  { spec: 'Neurologist',        qual: 'MD, DM Neurology',             exp: 16, lic: 'TN/MED/2007/011', dept: 'Neurology',        fee: 1400, rating: 4.7 },
  { spec: 'Pediatrician',       qual: 'MBBS, DCH, MD Pediatrics',     exp: 20, lic: 'MP/MED/2003/012', dept: 'Pediatrics',       fee: 650,  rating: 4.8 },
  { spec: 'Orthopedic Surgeon', qual: 'MBBS, MS, MCh Orthopaedics',  exp: 17, lic: 'KL/MED/2006/013', dept: 'Orthopedics',      fee: 950,  rating: 4.6 },
];

// ── 2. Staff users ────────────────────────────────────────────────────────────
const STAFF_USERS = [
  // Demo accounts
  { name: 'Ravi Mehta',         email: 'receptionist@medilink.com', pw: 'staff123', phone: '9811111101', sub: 'Receptionist',   gender: 'Male',   city: 'Mumbai' },
  { name: 'Sunita Kumari',      email: 'nurse@medilink.com',        pw: 'staff123', phone: '9811111102', sub: 'Nurse',           gender: 'Female', city: 'Delhi' },
  { name: 'Anil Sharma',        email: 'pharmacist@medilink.com',   pw: 'staff123', phone: '9811111103', sub: 'Pharmacist',      gender: 'Male',   city: 'Pune' },
  { name: 'Pooja Nair',         email: 'lab@medilink.com',          pw: 'staff123', phone: '9811111104', sub: 'Lab Technician',  gender: 'Female', city: 'Chennai' },
  { name: 'Suresh Pandey',      email: 'ward@medilink.com',         pw: 'staff123', phone: '9811111105', sub: 'Ward Manager',    gender: 'Male',   city: 'Lucknow' },
  // Extra receptionists
  { name: 'Neelam Agarwal',     email: 'neelam.a@medilink.com',    pw: 'pass1234', phone: '9811111106', sub: 'Receptionist',   gender: 'Female', city: 'Bangalore' },
  { name: 'Deepak Joshi',       email: 'deepak.j@medilink.com',    pw: 'pass1234', phone: '9811111107', sub: 'Receptionist',   gender: 'Male',   city: 'Jaipur' },
  // Extra nurses
  { name: 'Anitha Thomas',      email: 'anitha.t@medilink.com',    pw: 'pass1234', phone: '9811111108', sub: 'Nurse',           gender: 'Female', city: 'Kochi' },
  { name: 'Lalitha Krishnan',   email: 'lalitha.k@medilink.com',   pw: 'pass1234', phone: '9811111109', sub: 'Nurse',           gender: 'Female', city: 'Hyderabad' },
  // Extra pharmacists
  { name: 'Ganesh Patil',       email: 'ganesh.p@medilink.com',    pw: 'pass1234', phone: '9811111110', sub: 'Pharmacist',      gender: 'Male',   city: 'Nashik' },
  { name: 'Meera Pillai',       email: 'meera.pi@medilink.com',    pw: 'pass1234', phone: '9811111111', sub: 'Pharmacist',      gender: 'Female', city: 'Trivandrum' },
  // Extra lab techs
  { name: 'Rajan Dubey',        email: 'rajan.d@medilink.com',     pw: 'pass1234', phone: '9811111112', sub: 'Lab Technician',  gender: 'Male',   city: 'Varanasi' },
  // Extra ward managers
  { name: 'Indira Yadav',       email: 'indira.y@medilink.com',    pw: 'pass1234', phone: '9811111113', sub: 'Ward Manager',    gender: 'Female', city: 'Patna' },
];

const STAFF_PROFILES = [
  { desig: 'Senior Receptionist',     dept: 'Administration',  shift: 'Morning'   },
  { desig: 'Head Nurse',              dept: 'ICU',             shift: 'Rotational'},
  { desig: 'Senior Pharmacist',       dept: 'Pharmacy',        shift: 'Morning'   },
  { desig: 'Lab In-charge',           dept: 'Laboratory',      shift: 'Morning'   },
  { desig: 'Ward Manager',            dept: 'General Ward',    shift: 'Morning'   },
  { desig: 'Receptionist',            dept: 'Administration',  shift: 'Evening'   },
  { desig: 'Receptionist',            dept: 'Administration',  shift: 'Night'     },
  { desig: 'Staff Nurse',             dept: 'General Ward',    shift: 'Morning'   },
  { desig: 'ICU Nurse',               dept: 'ICU',             shift: 'Night'     },
  { desig: 'Pharmacist',              dept: 'Pharmacy',        shift: 'Evening'   },
  { desig: 'Pharmacist',              dept: 'Pharmacy',        shift: 'Night'     },
  { desig: 'Lab Technician',          dept: 'Laboratory',      shift: 'Evening'   },
  { desig: 'Ward In-charge',          dept: 'Private Ward',    shift: 'Evening'   },
];

// ── 3. Patient users (30) ─────────────────────────────────────────────────────
const PATIENT_DATA = [
  // Demo
  { name: 'Rahul Verma',       email: 'patient@medilink.com',     pw: 'patient123', phone: '9900001001', dob: new Date('1990-03-15'), gender: 'Male',   city: 'Mumbai',     bg: 'O+' },
  // Additional
  { name: 'Priya Agarwal',     email: 'priya.ag@patient.com',     pw: 'pass1234',   phone: '9900001002', dob: new Date('1988-07-22'), gender: 'Female', city: 'Delhi',      bg: 'A+' },
  { name: 'Suresh Kumar',      email: 'suresh.k@patient.com',     pw: 'pass1234',   phone: '9900001003', dob: new Date('1965-11-08'), gender: 'Male',   city: 'Pune',       bg: 'B+' },
  { name: 'Lakshmi Devi',      email: 'lakshmi.d@patient.com',    pw: 'pass1234',   phone: '9900001004', dob: new Date('1972-02-14'), gender: 'Female', city: 'Chennai',    bg: 'AB+' },
  { name: 'Amit Thakur',       email: 'amit.t@patient.com',       pw: 'pass1234',   phone: '9900001005', dob: new Date('1995-09-30'), gender: 'Male',   city: 'Bangalore',  bg: 'O-' },
  { name: 'Kavitha Nair',      email: 'kavitha.n@patient.com',    pw: 'pass1234',   phone: '9900001006', dob: new Date('1982-05-17'), gender: 'Female', city: 'Kochi',      bg: 'B-' },
  { name: 'Rajesh Mishra',     email: 'rajesh.m@patient.com',     pw: 'pass1234',   phone: '9900001007', dob: new Date('1958-12-25'), gender: 'Male',   city: 'Lucknow',    bg: 'A-' },
  { name: 'Ananya Sharma',     email: 'ananya.s@patient.com',     pw: 'pass1234',   phone: '9900001008', dob: new Date('2000-04-10'), gender: 'Female', city: 'Jaipur',     bg: 'AB-' },
  { name: 'Vikash Singh',      email: 'vikash.s@patient.com',     pw: 'pass1234',   phone: '9900001009', dob: new Date('1978-08-03'), gender: 'Male',   city: 'Patna',      bg: 'O+' },
  { name: 'Meena Patel',       email: 'meena.p@patient.com',      pw: 'pass1234',   phone: '9900001010', dob: new Date('1992-01-19'), gender: 'Female', city: 'Ahmedabad',  bg: 'A+' },
  { name: 'Dinesh Chaudhary',  email: 'dinesh.c@patient.com',     pw: 'pass1234',   phone: '9900001011', dob: new Date('1970-06-28'), gender: 'Male',   city: 'Agra',       bg: 'B+' },
  { name: 'Geeta Pillai',      email: 'geeta.pi@patient.com',     pw: 'pass1234',   phone: '9900001012', dob: new Date('1960-10-11'), gender: 'Female', city: 'Hyderabad',  bg: 'O+' },
  { name: 'Naresh Yadav',      email: 'naresh.y@patient.com',     pw: 'pass1234',   phone: '9900001013', dob: new Date('1985-03-07'), gender: 'Male',   city: 'Kanpur',     bg: 'AB+' },
  { name: 'Usha Reddy',        email: 'usha.r@patient.com',       pw: 'pass1234',   phone: '9900001014', dob: new Date('1967-09-14'), gender: 'Female', city: 'Visakhapatnam', bg: 'A+' },
  { name: 'Santosh Jain',      email: 'santosh.j@patient.com',    pw: 'pass1234',   phone: '9900001015', dob: new Date('1989-12-02'), gender: 'Male',   city: 'Indore',     bg: 'B+' },
  { name: 'Rekha Kumari',      email: 'rekha.k@patient.com',      pw: 'pass1234',   phone: '9900001016', dob: new Date('1975-04-20'), gender: 'Female', city: 'Bhopal',     bg: 'O-' },
  { name: 'Arun Mehta',        email: 'arun.me@patient.com',      pw: 'pass1234',   phone: '9900001017', dob: new Date('1993-07-16'), gender: 'Male',   city: 'Surat',      bg: 'A-' },
  { name: 'Bindu Thomas',      email: 'bindu.t@patient.com',      pw: 'pass1234',   phone: '9900001018', dob: new Date('1969-02-08'), gender: 'Female', city: 'Thrissur',   bg: 'B-' },
  { name: 'Manoj Gupta',       email: 'manoj.g@patient.com',      pw: 'pass1234',   phone: '9900001019', dob: new Date('1981-11-27'), gender: 'Male',   city: 'Nagpur',     bg: 'AB-' },
  { name: 'Sarita Sharma',     email: 'sarita.sh@patient.com',    pw: 'pass1234',   phone: '9900001020', dob: new Date('1956-08-05'), gender: 'Female', city: 'Varanasi',   bg: 'O+' },
  { name: 'Ravi Krishnamurthy',email: 'ravi.kr@patient.com',      pw: 'pass1234',   phone: '9900001021', dob: new Date('1998-01-31'), gender: 'Male',   city: 'Coimbatore', bg: 'A+' },
  { name: 'Pooja Dubey',       email: 'pooja.du@patient.com',     pw: 'pass1234',   phone: '9900001022', dob: new Date('1990-05-25'), gender: 'Female', city: 'Raipur',     bg: 'B+' },
  { name: 'Harish Kapoor',     email: 'harish.ka@patient.com',    pw: 'pass1234',   phone: '9900001023', dob: new Date('1962-03-13'), gender: 'Male',   city: 'Amritsar',   bg: 'O+' },
  { name: 'Sudha Iyer',        email: 'sudha.iy@patient.com',     pw: 'pass1234',   phone: '9900001024', dob: new Date('1977-10-09'), gender: 'Female', city: 'Madurai',    bg: 'AB+' },
  { name: 'Kiran Shinde',      email: 'kiran.sh@patient.com',     pw: 'pass1234',   phone: '9900001025', dob: new Date('1994-06-18'), gender: 'Male',   city: 'Nasik',      bg: 'A+' },
  { name: 'Vandana Tiwari',    email: 'vandana.t@patient.com',    pw: 'pass1234',   phone: '9900001026', dob: new Date('1983-09-04'), gender: 'Female', city: 'Allahabad',  bg: 'B+' },
  { name: 'Prasad Rao',        email: 'prasad.r@patient.com',     pw: 'pass1234',   phone: '9900001027', dob: new Date('1973-04-22'), gender: 'Male',   city: 'Vijayawada', bg: 'O-' },
  { name: 'Shanti Devi',       email: 'shanti.d@patient.com',     pw: 'pass1234',   phone: '9900001028', dob: new Date('1949-12-30'), gender: 'Female', city: 'Bareilly',   bg: 'A-' },
  { name: 'Nitin Pandey',      email: 'nitin.pa@patient.com',     pw: 'pass1234',   phone: '9900001029', dob: new Date('1987-07-11'), gender: 'Male',   city: 'Jodhpur',    bg: 'B-' },
  { name: 'Geetha Balan',      email: 'geetha.b@patient.com',     pw: 'pass1234',   phone: '9900001030', dob: new Date('1964-01-06'), gender: 'Female', city: 'Tirunelveli', bg: 'AB+' },
  { name: 'Kartik Arora',      email: 'kartik.a@patient.com',     pw: 'pass1234',   phone: '9900001031', dob: new Date('2002-08-14'), gender: 'Male',   city: 'Chandigarh', bg: 'O+' },
  { name: 'Nandini Ghosh',     email: 'nandini.g@patient.com',    pw: 'pass1234',   phone: '9900001032', dob: new Date('1979-03-28'), gender: 'Female', city: 'Kolkata',    bg: 'A+' },
];

// ── 4. Medicines (28) ─────────────────────────────────────────────────────────
const MEDICINES_RAW = [
  // Antibiotics
  { name: 'Amoxicillin 500mg',      gen: 'Amoxicillin',        mfg: 'Cipla Ltd',               cat: 'Antibiotic',        form: 'Capsule',  str: '500mg',  price: 12,   stock: 500, reorder: 100, expiry: daysAhead(365) },
  { name: 'Azithromycin 500mg',     gen: 'Azithromycin',       mfg: 'Sun Pharma',              cat: 'Antibiotic',        form: 'Tablet',   str: '500mg',  price: 28,   stock: 300, reorder: 60,  expiry: daysAhead(400) },
  { name: 'Cephalexin 250mg',       gen: 'Cephalexin',         mfg: 'Lupin Ltd',               cat: 'Antibiotic',        form: 'Capsule',  str: '250mg',  price: 9,    stock: 450, reorder: 80,  expiry: daysAhead(300) },
  // Analgesics
  { name: 'Paracetamol 650mg',      gen: 'Paracetamol',        mfg: 'Dr. Reddy\'s',            cat: 'Analgesic',         form: 'Tablet',   str: '650mg',  price: 2,    stock: 2000,reorder: 500, expiry: daysAhead(550) },
  { name: 'Ibuprofen 400mg',        gen: 'Ibuprofen',          mfg: 'Abbott India',            cat: 'Analgesic',         form: 'Tablet',   str: '400mg',  price: 5,    stock: 800, reorder: 150, expiry: daysAhead(480) },
  { name: 'Diclofenac 50mg',        gen: 'Diclofenac Sodium',  mfg: 'Novartis India',          cat: 'Anti-inflammatory', form: 'Tablet',   str: '50mg',   price: 4,    stock: 600, reorder: 100, expiry: daysAhead(420) },
  // Antihypertensives
  { name: 'Amlodipine 5mg',         gen: 'Amlodipine',         mfg: 'Pfizer India',            cat: 'Antihypertensive',  form: 'Tablet',   str: '5mg',    price: 6,    stock: 700, reorder: 120, expiry: daysAhead(500) },
  { name: 'Telmisartan 40mg',       gen: 'Telmisartan',        mfg: 'Glenmark Pharma',         cat: 'Antihypertensive',  form: 'Tablet',   str: '40mg',   price: 8,    stock: 550, reorder: 100, expiry: daysAhead(460) },
  { name: 'Atenolol 50mg',          gen: 'Atenolol',           mfg: 'Cipla Ltd',               cat: 'Cardiovascular',    form: 'Tablet',   str: '50mg',   price: 7,    stock: 400, reorder: 80,  expiry: daysAhead(390) },
  // Antidiabetics
  { name: 'Metformin 500mg',        gen: 'Metformin HCl',      mfg: 'USV Ltd',                 cat: 'Antidiabetic',      form: 'Tablet',   str: '500mg',  price: 3,    stock: 1200,reorder: 200, expiry: daysAhead(600) },
  { name: 'Glimepiride 2mg',        gen: 'Glimepiride',        mfg: 'Sanofi India',            cat: 'Antidiabetic',      form: 'Tablet',   str: '2mg',    price: 9,    stock: 400, reorder: 80,  expiry: daysAhead(350) },
  // Antihistamines
  { name: 'Cetirizine 10mg',        gen: 'Cetirizine HCl',     mfg: 'Mankind Pharma',          cat: 'Antihistamine',     form: 'Tablet',   str: '10mg',   price: 3,    stock: 900, reorder: 150, expiry: daysAhead(440) },
  { name: 'Montelukast 10mg',       gen: 'Montelukast Sodium', mfg: 'Merck India',             cat: 'Respiratory',       form: 'Tablet',   str: '10mg',   price: 18,   stock: 300, reorder: 60,  expiry: daysAhead(380) },
  // GI
  { name: 'Omeprazole 20mg',        gen: 'Omeprazole',         mfg: 'AstraZeneca India',       cat: 'Gastrointestinal',  form: 'Capsule',  str: '20mg',   price: 7,    stock: 800, reorder: 150, expiry: daysAhead(520) },
  { name: 'Pantoprazole 40mg',      gen: 'Pantoprazole',       mfg: 'Zydus Healthcare',        cat: 'Gastrointestinal',  form: 'Tablet',   str: '40mg',   price: 10,   stock: 600, reorder: 100, expiry: daysAhead(450) },
  { name: 'Domperidone 10mg',       gen: 'Domperidone',        mfg: 'Alkem Labs',              cat: 'Gastrointestinal',  form: 'Tablet',   str: '10mg',   price: 4,    stock: 500, reorder: 80,  expiry: daysAhead(340) },
  // Neuro
  { name: 'Alprazolam 0.25mg',      gen: 'Alprazolam',         mfg: 'Torrent Pharma',          cat: 'Neurological',      form: 'Tablet',   str: '0.25mg', price: 5,    stock: 200, reorder: 40,  expiry: daysAhead(310) },
  { name: 'Pregabalin 75mg',        gen: 'Pregabalin',         mfg: 'Intas Pharma',            cat: 'Neurological',      form: 'Capsule',  str: '75mg',   price: 22,   stock: 250, reorder: 50,  expiry: daysAhead(280) },
  // Derm
  { name: 'Betamethasone Cream',    gen: 'Betamethasone',      mfg: 'GlaxoSmithKline India',   cat: 'Dermatological',    form: 'Cream',    str: '0.05%',  price: 45,   stock: 120, reorder: 25,  expiry: daysAhead(270) },
  { name: 'Clotrimazole Cream 1%',  gen: 'Clotrimazole',       mfg: 'Bayer Zydus',             cat: 'Dermatological',    form: 'Cream',    str: '1%',     price: 38,   stock: 150, reorder: 30,  expiry: daysAhead(360) },
  // Cardiac
  { name: 'Atorvastatin 10mg',      gen: 'Atorvastatin Calcium',mfg:'Ranbaxy Labs',            cat: 'Cardiovascular',    form: 'Tablet',   str: '10mg',   price: 11,   stock: 600, reorder: 100, expiry: daysAhead(510) },
  { name: 'Aspirin 75mg',           gen: 'Acetylsalicylic Acid',mfg:'Bayer India',             cat: 'Cardiovascular',    form: 'Tablet',   str: '75mg',   price: 2,    stock: 1500,reorder: 300, expiry: daysAhead(580) },
  // Syrups
  { name: 'Ambroxol Syrup 30mg/5ml',gen: 'Ambroxol HCl',       mfg: 'Boehringer Ingelheim',    cat: 'Respiratory',       form: 'Syrup',    str: '30mg/5ml', price: 55, stock: 200, reorder: 40,  expiry: daysAhead(200) },
  { name: 'Cetirizine Syrup 5mg/5ml',gen:'Cetirizine HCl',      mfg: 'Cipla Ltd',               cat: 'Antihistamine',     form: 'Syrup',    str: '5mg/5ml',price: 48,   stock: 180, reorder: 35,  expiry: daysAhead(240) },
  // Injections
  { name: 'Ondansetron 4mg/2ml Inj',gen: 'Ondansetron HCl',    mfg: 'GlaxoSmithKline India',   cat: 'Gastrointestinal',  form: 'Injection',str: '4mg/2ml',price: 65,   stock: 100, reorder: 20,  expiry: daysAhead(180) },
  // Low stock / critical
  { name: 'Insulin Glargine 100U/ml',gen:'Insulin Glargine',    mfg: 'Sanofi India',            cat: 'Antidiabetic',      form: 'Injection',str: '100U/ml',price: 1200, stock: 8,   reorder: 15,  expiry: daysAhead(90) },
  // Near expiry (within 30 days)
  { name: 'Cefixime 200mg',         gen: 'Cefixime',            mfg: 'Cadila Healthcare',       cat: 'Antibiotic',        form: 'Tablet',   str: '200mg',  price: 32,   stock: 60,  reorder: 50,  expiry: daysAhead(20) },
  // Expired
  { name: 'Ranitidine 150mg',       gen: 'Ranitidine HCl',      mfg: 'GSK India',               cat: 'Gastrointestinal',  form: 'Tablet',   str: '150mg',  price: 4,    stock: 200, reorder: 50,  expiry: daysAgo(15) },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 MediLink Seed Script — Starting…\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── Clear all collections ────────────────────────────────────────────────────
  console.log('🗑  Clearing existing data…');
  await Promise.all([
    User.deleteMany({}), Doctor.deleteMany({}), Staff.deleteMany({}),
    Patient.deleteMany({}), Appointment.deleteMany({}), Prescription.deleteMany({}),
    Medicine.deleteMany({}), Billing.deleteMany({}), Ward.deleteMany({})
  ]);
  console.log('   ✓ All collections cleared\n');

  // ── 1. Admin user ────────────────────────────────────────────────────────────
  console.log('👤 Creating admin user…');
  const adminUser = await User.create({
    name:        'Admin MediLink',
    email:       'admin@medilink.com',
    password:    await hash('admin123'),
    role:        'Admin',
    phone:       '9800000000',
    dateOfBirth: new Date('1985-01-01'),
    gender:      'Male',
    address:     { street: '1 Hospital Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' },
    isActive:    true,
  });
  console.log(`   ✓ Admin: admin@medilink.com / admin123 (ID: ${adminUser._id})\n`);

  // ── 2. Doctor users + profiles ───────────────────────────────────────────────
  console.log('👨‍⚕️ Creating doctors…');
  const doctorUserDocs = [];
  for (const d of DOCTOR_USERS) {
    const u = await User.create({
      name: d.name, email: d.email, password: await hash(d.pw),
      role: 'Doctor', phone: d.phone, dateOfBirth: d.dob, gender: d.gender,
      address: { city: d.city, country: 'India' }, isActive: true
    });
    doctorUserDocs.push(u);
  }
  const doctorProfiles = [];
  for (let i = 0; i < doctorUserDocs.length; i++) {
    const p = DOCTOR_PROFILES[i] || DOCTOR_PROFILES[0];
    const doc = await Doctor.create({
      userId:          doctorUserDocs[i]._id,
      specialization:  p.spec,
      qualification:   p.qual,
      experience:      p.exp,
      licenseNumber:   p.lic,
      department:      p.dept,
      consultationFee: p.fee,
      rating:          p.rating,
      totalRatings:    randN(50, 200),
      isAvailable:     true,
      availability:    AVAILABILITY,
    });
    doctorProfiles.push(doc);
    process.stdout.write(`   ✓ ${doctorUserDocs[i].name} (${p.spec})\n`);
  }
  console.log();

  // ── 3. Staff users + profiles ────────────────────────────────────────────────
  console.log('👩‍⚕️ Creating staff…');
  const staffUserDocs = [];
  for (const s of STAFF_USERS) {
    const u = await User.create({
      name: s.name, email: s.email, password: await hash(s.pw),
      role: 'Staff', subRole: s.sub, phone: s.phone,
      dateOfBirth: new Date(`${randN(1975,1990)}-0${randN(1,9)}-${String(randN(1,28)).padStart(2,'0')}`),
      gender: s.gender,
      address: { city: s.city, country: 'India' }, isActive: true
    });
    staffUserDocs.push(u);
  }
  for (let i = 0; i < staffUserDocs.length; i++) {
    const p = STAFF_PROFILES[i] || STAFF_PROFILES[0];
    await Staff.create({
      userId:         staffUserDocs[i]._id,
      designation:    p.desig,
      department:     p.dept,
      qualification:  'BSc, Diploma in ' + STAFF_USERS[i].sub,
      joiningDate:    daysAgo(randN(200, 1800)),
      employmentType: 'Full-Time',
      shift:          p.shift,
      salary:         { basic: randN(25000, 55000), allowances: 5000, total: randN(30000, 60000) },
      isActive:       true,
    });
    process.stdout.write(`   ✓ ${staffUserDocs[i].name} (${STAFF_USERS[i].sub})\n`);
  }
  console.log();

  // ── 4. Patient users + profiles ──────────────────────────────────────────────
  console.log('🧑 Creating patients…');
  const patientUserDocs = [];
  const patientProfiles = [];
  const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
  const CONDITIONS = [
    'Hypertension','Diabetes Mellitus Type 2','Asthma','Hypothyroidism',
    'Migraine','Chronic Back Pain','Gastritis','Anxiety Disorder',
    'Anemia','Hyperlipidemia'
  ];
  const ALLERGIES = ['Penicillin','Sulfa drugs','Aspirin','Peanuts','Dust','Pollen','Latex','Shellfish'];

  for (let i = 0; i < PATIENT_DATA.length; i++) {
    const pd = PATIENT_DATA[i];
    const u = await User.create({
      name: pd.name, email: pd.email, password: await hash(pd.pw),
      role: 'Patient', phone: pd.phone, dateOfBirth: pd.dob, gender: pd.gender,
      address: { city: pd.city, country: 'India' }, isActive: true
    });
    patientUserDocs.push(u);

    // Auto-generate patientId
    const idx = String(i + 1).padStart(5, '0');
    const hasCondition = Math.random() > 0.4;
    const hasAllergy   = Math.random() > 0.5;

    const profile = await Patient.create({
      userId:    u._id,
      patientId: `PAT2024${idx}`,
      bloodGroup: pd.bg || rand(BLOOD_GROUPS),
      emergencyContact: { name: `${pd.name.split(' ')[0]}'s Relative`, phone: `98${randN(10000000, 99999999)}`, relation: rand(['Spouse','Parent','Sibling','Child']) },
      medicalHistory: hasCondition ? [{
        condition:    rand(CONDITIONS),
        diagnosedDate: daysAgo(randN(30, 2000)),
        status:        rand(['Active','Chronic']),
        notes:         'Managed with medication',
      }] : [],
      allergies: hasAllergy ? [rand(ALLERGIES)] : [],
    });
    patientProfiles.push(profile);
  }
  console.log(`   ✓ ${patientProfiles.length} patients created\n`);

  // ── 5. Medicines ─────────────────────────────────────────────────────────────
  console.log('💊 Creating medicines…');
  const medicines = [];
  for (const m of MEDICINES_RAW) {
    const med = await Medicine.create({
      name: m.name, genericName: m.gen, manufacturer: m.mfg,
      category: m.cat, dosageForm: m.form, strength: m.str,
      unitPrice: m.price, stockQuantity: m.stock, reorderLevel: m.reorder,
      expiryDate: m.expiry,
      batchNumber: `BN${randN(100000, 999999)}`,
      supplier: { name: 'MediSupply India Pvt Ltd', contact: '1800-000-MEDS', email: 'orders@medisupply.in' },
      prescriptionRequired: m.cat !== 'Analgesic' && m.cat !== 'Gastrointestinal',
      isActive: true,
      lastRestocked: daysAgo(randN(5, 60)),
    });
    medicines.push(med);
  }
  console.log(`   ✓ ${medicines.length} medicines created\n`);

  // ── 6. Appointments ───────────────────────────────────────────────────────────
  console.log('📅 Creating appointments…');

  const DIAGS = [
    'Viral Upper Respiratory Infection', 'Essential Hypertension', 'Type 2 Diabetes Mellitus',
    'Migraine without Aura', 'Acute Gastritis', 'Lumbar Spondylosis', 'Atopic Dermatitis',
    'Seasonal Allergic Rhinitis', 'Anxiety Disorder (GAD)', 'Ischemic Heart Disease',
    'Peripheral Neuropathy', 'Bronchial Asthma', 'Iron Deficiency Anemia', 'Hypothyroidism',
    'Tension Headache', 'Acute Pharyngitis', 'Psoriasis', 'Osteoarthritis of Knee',
  ];
  const SYMPTOMS_LIST = [
    'Fever, body ache, sore throat', 'Headache, dizziness, palpitations',
    'Increased thirst, frequent urination, fatigue', 'Throbbing headache, nausea, photophobia',
    'Burning epigastric pain, bloating, nausea', 'Lower back pain, stiffness, radiation to left leg',
    'Dry itchy skin, rash, erythema', 'Sneezing, watery eyes, nasal congestion',
    'Excessive worry, restlessness, sleep disturbance', 'Chest pain, breathlessness on exertion',
    'Numbness tingling in limbs, burning sensation', 'Wheeze, breathlessness, nocturnal cough',
    'Fatigue, pallor, weakness', 'Cold intolerance, weight gain, fatigue',
    'Bilateral frontal headache, stress-related', 'Sore throat, odynophagia, fever',
    'Scaly plaques on scalp and elbows', 'Knee pain, crepitus, morning stiffness',
  ];

  const pastAppointments = [];
  const futureAppointments = [];

  // Past appointments spread across the full year (for meaningful revenue charts)
  for (let di = 0; di < doctorProfiles.length; di++) {
    for (let ai = 0; ai < 8; ai++) {
      const ptIdx   = (di * 8 + ai) % patientProfiles.length;
      const slot    = pickSlot();
      const diagIdx = (di + ai) % DIAGS.length;
      // Spread evenly across up to 365 days back, with more weight on recent months
      const daysBack = ai < 3 ? randN(5, 60) : randN(60, 330);
      const appt = await Appointment.create({
        patient:         patientProfiles[ptIdx]._id,
        doctor:          doctorProfiles[di]._id,
        appointmentDate: daysAgo(daysBack),
        timeSlot:        { startTime: slot[0], endTime: slot[1] },
        type:            rand(['Consultation','Follow-up','Consultation','Consultation']),
        status:          'Completed',
        priority:        rand(['Normal','Normal','Normal','Urgent']),
        symptoms:        SYMPTOMS_LIST[diagIdx % SYMPTOMS_LIST.length],
        diagnosis:       DIAGS[diagIdx],
        consultationFee: doctorProfiles[di].consultationFee || 500,
        notes:           'Patient reviewed and advised accordingly.',
      });
      pastAppointments.push({ appt, doctor: doctorProfiles[di], patient: patientProfiles[ptIdx], ptUser: patientUserDocs[ptIdx] });
    }
  }

  // 2 future appointments per doctor
  for (let di = 0; di < doctorProfiles.length; di++) {
    for (let ai = 0; ai < 2; ai++) {
      const ptIdx = (di * 2 + ai + 15) % patientProfiles.length;
      const slot  = pickSlot();
      const appt = await Appointment.create({
        patient:         patientProfiles[ptIdx]._id,
        doctor:          doctorProfiles[di]._id,
        appointmentDate: daysAhead(randN(1, 30)),
        timeSlot:        { startTime: slot[0], endTime: slot[1] },
        type:            rand(['Consultation','Follow-up','Consultation']),
        status:          rand(['Scheduled','Confirmed']),
        priority:        'Normal',
        symptoms:        rand(SYMPTOMS_LIST),
        consultationFee: doctorProfiles[di].consultationFee || 500,
      });
      futureAppointments.push({ appt, doctor: doctorProfiles[di], patient: patientProfiles[ptIdx] });
    }
  }

  console.log(`   ✓ ${pastAppointments.length} past appointments created`);
  console.log(`   ✓ ${futureAppointments.length} future appointments created\n`);

  // ── 7. Prescriptions (from past completed appointments) ────────────────────
  console.log('📄 Creating prescriptions…');
  const prescriptions = [];

  // Every past appointment gets a prescription
  for (const { appt, doctor, patient } of pastAppointments) {
    // Pick 2-3 medicines relevant to diagnosis
    const numMeds = randN(2, 3);
    const shuffled = [...medicines].sort(() => Math.random() - 0.5).slice(0, numMeds);
    const medEntries = shuffled.map(m => ({
      medicine:     m._id,
      dosage:       rand(['1 tablet', '2 tablets', '½ tablet', '5ml', '10ml']),
      frequency:    rand(['Once daily', 'Twice daily', 'Three times daily', 'At bedtime', 'Every 8 hours']),
      duration:     rand(['5 days', '7 days', '14 days', '30 days', '3 months']),
      instructions: rand(['Take after meals', 'Take before meals', 'Take with water', 'Take at bedtime', 'Take with food']),
      quantity:     randN(10, 60),
    }));

    const rx = await Prescription.create({
      patient:     patient._id,
      doctor:      doctor._id,
      appointment: appt._id,
      medicines:   medEntries,
      diagnosis:   appt.diagnosis,
      symptoms:    appt.symptoms,
      labTests:    Math.random() > 0.6 ? [rand(['CBC','LFT','RFT','Blood Sugar (F/PP)','Lipid Profile','Thyroid Profile','Urine Routine'])] : [],
      status:      rand(['Fulfilled','Fulfilled','Partially-Filled','Pending']),
      refillsAllowed: rand([0, 0, 0, 1, 2]),
      validUntil:  daysAhead(randN(7, 90)),
      notes:       'Follow up if symptoms persist or worsen.',
    });

    // Link prescription back to appointment
    await Appointment.findByIdAndUpdate(appt._id, { prescription: rx._id });
    prescriptions.push({ rx, doctor, patient, meds: medEntries.map((m, i) => ({ ...m, name: shuffled[i].name, unitPrice: shuffled[i].unitPrice })) });
  }
  console.log(`   ✓ ${prescriptions.length} prescriptions created\n`);

  // ── 8. Billing ────────────────────────────────────────────────────────────────
  console.log('💳 Creating bills…');
  let totalBills = 0;

  const systemUser = adminUser;

  // --- A. Consultation bills (one per past appointment) ----------------------
  for (const { appt, doctor, patient, ptUser } of pastAppointments) {
    const fee    = appt.consultationFee || 500;
    const paid   = Math.random() > 0.3; // 70% paid
    const amt    = paid ? fee : 0;
    const status = paid ? 'Paid' : 'Unpaid';

    const bill = new Billing({
      patient:         patient._id,
      billType:        'Consultation',
      billDate:        appt.appointmentDate,
      items: [{
        description: `${doctor.specialization} Consultation`,
        category:    'Consultation',
        quantity:    1,
        unitPrice:   fee,
        amount:      fee,
      }],
      subtotal:      fee,
      discount:      0,
      tax:           0,
      totalAmount:   fee,
      amountPaid:    amt,
      balance:       fee - amt,
      paymentStatus: status,
      paymentMethod: paid ? rand(['Cash','Card','UPI','Net Banking']) : undefined,
      payments:      paid ? [{ amount: fee, paymentMethod: rand(['Cash','Card','UPI']), paymentDate: appt.appointmentDate }] : [],
      createdByRole: 'Receptionist',
      generatedBy:   systemUser._id,
      relatedAppointmentId: appt._id,
      notes:         `Consultation with ${doctorUserDocs.find(u => u._id.toString() === doctor.userId.toString())?.name || 'Doctor'}`,
    });
    bill.billNumber = billNum();
    await bill.save();
    totalBills++;
  }

  // --- B. Pharmacy bills (from fulfilled/partially-filled prescriptions) -----
  for (const { rx, doctor, patient, meds } of prescriptions) {
    if (rx.status === 'Pending') continue; // skip unfilled

    const items = meds.map(m => ({
      description: m.name,
      category:    'Medicine',
      quantity:    randN(1, 3),
      unitPrice:   m.unitPrice,
      amount:      m.unitPrice * randN(1, 3),
    }));
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const discount = Math.random() > 0.7 ? randN(10, Math.floor(subtotal * 0.1)) : 0;
    const total    = subtotal - discount;
    const paid     = Math.random() > 0.25; // 75% paid
    const amtPaid  = paid ? total : 0;
    const status   = paid ? 'Paid' : 'Unpaid';

    const bill = new Billing({
      patient:         patient._id,
      billType:        'Pharmacy',
      billDate:        new Date(rx.createdAt.getTime() + 1000 * 60 * 30), // 30 min after prescription
      items,
      subtotal,
      discount,
      tax:             0,
      totalAmount:     total,
      amountPaid:      amtPaid,
      balance:         total - amtPaid,
      paymentStatus:   status,
      paymentMethod:   paid ? rand(['Cash','UPI','Card']) : undefined,
      payments:        paid ? [{ amount: total, paymentMethod: rand(['Cash','UPI']), paymentDate: new Date(rx.createdAt) }] : [],
      createdByRole:   'Pharmacist',
      generatedBy:     systemUser._id,
    });
    bill.billNumber = billNum();
    await bill.save();
    totalBills++;
  }

  // --- C. Lab/Test bills (for a subset of patients) --------------------------
  const LAB_TESTS = [
    { name: 'Complete Blood Count (CBC)',      price: 350  },
    { name: 'Liver Function Test (LFT)',       price: 550  },
    { name: 'Renal Function Test (RFT)',       price: 500  },
    { name: 'Blood Sugar (Fasting)',           price: 120  },
    { name: 'Lipid Profile',                   price: 700  },
    { name: 'Thyroid Function Test (TSH)',     price: 400  },
    { name: 'Urine Routine Microscopy',        price: 150  },
    { name: 'HbA1c',                           price: 450  },
    { name: 'ECG',                             price: 200  },
    { name: 'X-Ray Chest PA View',             price: 500  },
    { name: 'Ultrasound Abdomen',              price: 1200 },
    { name: '2D Echo',                         price: 2500 },
    { name: 'MRI Brain with Contrast',         price: 8000 },
    { name: 'CT Scan Abdomen',                 price: 5500 },
  ];

  // One test bill for every 3rd patient
  for (let i = 0; i < patientProfiles.length; i += 3) {
    const tests = LAB_TESTS.slice(0, randN(1, 3)).map(t => ({
      description: t.name,
      category:    'Lab Test',
      quantity:    1,
      unitPrice:   t.price,
      amount:      t.price,
    }));
    const subtotal = tests.reduce((s, t) => s + t.amount, 0);
    const paid = Math.random() > 0.4;
    const amtPaid = paid ? subtotal : 0;

    const bill = new Billing({
      patient:        patientProfiles[i]._id,
      billType:       'Test',
      billDate:       daysAgo(randN(1, 60)),
      items:          tests,
      subtotal,
      discount:       0,
      tax:            0,
      totalAmount:    subtotal,
      amountPaid:     amtPaid,
      balance:        subtotal - amtPaid,
      paymentStatus:  paid ? 'Paid' : 'Unpaid',
      paymentMethod:  paid ? rand(['Cash','Card','UPI','Net Banking']) : undefined,
      payments:       paid ? [{ amount: subtotal, paymentMethod: rand(['Cash','Card']), paymentDate: daysAgo(randN(1, 60)) }] : [],
      createdByRole:  'Receptionist',
      generatedBy:    systemUser._id,
    });
    bill.billNumber = billNum();
    await bill.save();
    totalBills++;
  }

  // --- D. Partially-paid and insurance bills --------------------------------
  // Create 5 partially-paid consultation bills
  for (let i = 0; i < 5; i++) {
    const ptIdx = randN(0, patientProfiles.length - 1);
    const docIdx = randN(0, doctorProfiles.length - 1);
    const fee = doctorProfiles[docIdx].consultationFee || 500;
    const amtPaid = Math.floor(fee * 0.5);

    const bill = new Billing({
      patient:        patientProfiles[ptIdx]._id,
      billType:       'Consultation',
      billDate:       daysAgo(randN(3, 30)),
      items: [{
        description: 'Specialist Consultation',
        category:    'Consultation',
        quantity:    1,
        unitPrice:   fee,
        amount:      fee,
      }],
      subtotal:       fee,
      discount:       0,
      tax:            0,
      totalAmount:    fee,
      amountPaid:     amtPaid,
      balance:        fee - amtPaid,
      paymentStatus:  'Partially-Paid',
      paymentMethod:  'Cash',
      payments:       [{ amount: amtPaid, paymentMethod: 'Cash', paymentDate: daysAgo(randN(1, 20)) }],
      createdByRole:  'Receptionist',
      generatedBy:    systemUser._id,
    });
    bill.billNumber = billNum();
    await bill.save();
    totalBills++;
  }

  console.log(`   ✓ ${totalBills} bills created\n`);

  // ── 9. Wards ──────────────────────────────────────────────────────────────────
  console.log('🏥 Creating wards…');

  const assignedPatients = new Set();

  const makeWard = async (wNum, wName, wType, dept, floor, total, avail, beds, gender, dailyRate, facilities) => {
    const ward = await Ward.create({
      wardNumber:    wNum,
      wardName:      wName,
      wardType:      wType,
      department:    dept,
      floor,
      totalBeds:     total,
      availableBeds: avail,
      beds,
      gender,
      facilities,
      dailyRate,
      isActive: true,
    });
    return ward;
  };

  const occupyBed = (bedNum, ptProfile, daysBack = 3) => {
    if (!ptProfile || assignedPatients.has(ptProfile._id.toString())) return { bedNumber: bedNum, isOccupied: false };
    assignedPatients.add(ptProfile._id.toString());
    return {
      bedNumber:              bedNum,
      isOccupied:             true,
      patient:                ptProfile._id,
      admissionDate:          daysAgo(daysBack),
      expectedDischargeDate:  daysAhead(randN(1, 5)),
    };
  };
  const emptyBed = (bedNum) => ({ bedNumber: bedNum, isOccupied: false });

  // General Ward — 12 beds, 5 occupied
  const gBeds = [
    occupyBed('G-001', patientProfiles[5],  5),
    occupyBed('G-002', patientProfiles[8],  3),
    occupyBed('G-003', patientProfiles[11], 7),
    occupyBed('G-004', patientProfiles[14], 2),
    occupyBed('G-005', patientProfiles[17], 4),
    emptyBed('G-006'), emptyBed('G-007'), emptyBed('G-008'),
    emptyBed('G-009'), emptyBed('G-010'), emptyBed('G-011'), emptyBed('G-012'),
  ];
  await makeWard('W-001','General Ward','General','General Medicine',2,12,7,gBeds,'Mixed',800,['Nursing Station','TV','WiFi','Attached Washroom']);

  // ICU — 6 beds, 3 occupied
  const icuBeds = [
    occupyBed('ICU-01', patientProfiles[2],  1),
    occupyBed('ICU-02', patientProfiles[6],  2),
    occupyBed('ICU-03', patientProfiles[20], 1),
    emptyBed('ICU-04'), emptyBed('ICU-05'), emptyBed('ICU-06'),
  ];
  await makeWard('W-002','ICU','ICU','Critical Care',3,6,3,icuBeds,'Mixed',5500,['Ventilator','Cardiac Monitor','Central Nursing Station','24h Specialist']);

  // Private Ward — 8 beds, 3 occupied
  const pvtBeds = [
    occupyBed('PV-001', patientProfiles[1],  2),
    occupyBed('PV-002', patientProfiles[9],  3),
    occupyBed('PV-003', patientProfiles[25], 1),
    emptyBed('PV-004'), emptyBed('PV-005'), emptyBed('PV-006'), emptyBed('PV-007'), emptyBed('PV-008'),
  ];
  await makeWard('W-003','Private Ward','Private','General Medicine',4,8,5,pvtBeds,'Mixed',2500,['Private Bathroom','AC','TV','WiFi','Sofa Bed for Attendant','Mini Fridge']);

  // Pediatric Ward — 6 beds, 2 occupied
  const pedBeds = [
    occupyBed('PED-01', patientProfiles[3],  4),
    occupyBed('PED-02', patientProfiles[22], 2),
    emptyBed('PED-03'), emptyBed('PED-04'), emptyBed('PED-05'), emptyBed('PED-06'),
  ];
  await makeWard('W-004','Paediatric Ward','General','Pediatrics',2,6,4,pedBeds,'Mixed',1200,['Crib Beds','Play Area','Paediatric Nurses','24h Monitoring']);

  // Emergency Ward — 4 beds, 1 occupied
  const emBeds = [
    occupyBed('EM-001', patientProfiles[29], 1),
    emptyBed('EM-002'), emptyBed('EM-003'), emptyBed('EM-004'),
  ];
  await makeWard('W-005','Emergency Ward','Emergency','Emergency Medicine',1,4,3,emBeds,'Mixed',3000,['Emergency Equipment','Triage Station','Resuscitation Bay','24h Staffing']);

  // Semi-Private Ward — 6 beds, 2 occupied
  const spBeds = [
    occupyBed('SP-001', patientProfiles[13], 3),
    occupyBed('SP-002', patientProfiles[27], 2),
    emptyBed('SP-003'), emptyBed('SP-004'), emptyBed('SP-005'), emptyBed('SP-006'),
  ];
  await makeWard('W-006','Semi-Private Ward','Semi-Private','General Medicine',3,6,4,spBeds,'Mixed',1600,['Shared Bathroom','AC','TV']);

  console.log('   ✓ 6 wards created with occupied and available beds\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  const finalCounts = await Promise.all([
    User.countDocuments(), Doctor.countDocuments(), Staff.countDocuments(),
    Patient.countDocuments(), Appointment.countDocuments(), Prescription.countDocuments(),
    Medicine.countDocuments(), Billing.countDocuments(), Ward.countDocuments(),
  ]);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  🎉 MediLink Seed Complete — Database Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Users:         ${finalCounts[0]}`);
  console.log(`  Doctors:       ${finalCounts[1]}`);
  console.log(`  Staff:         ${finalCounts[2]}`);
  console.log(`  Patients:      ${finalCounts[3]}`);
  console.log(`  Appointments:  ${finalCounts[4]}`);
  console.log(`  Prescriptions: ${finalCounts[5]}`);
  console.log(`  Medicines:     ${finalCounts[6]}`);
  console.log(`  Bills:         ${finalCounts[7]}`);
  console.log(`  Wards:         ${finalCounts[8]}`);
  console.log('───────────────────────────────────────────────────────');
  console.log('  Demo Login Credentials');
  console.log('───────────────────────────────────────────────────────');
  console.log('  Admin       → admin@medilink.com       / admin123');
  console.log('  Doctor      → doctor@medilink.com      / doctor123');
  console.log('  Patient     → patient@medilink.com     / patient123');
  console.log('  Receptionist→ receptionist@medilink.com/ staff123');
  console.log('  Nurse       → nurse@medilink.com       / staff123');
  console.log('  Pharmacist  → pharmacist@medilink.com  / staff123');
  console.log('  Lab Tech    → lab@medilink.com         / staff123');
  console.log('  Ward Manager→ ward@medilink.com        / staff123');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});

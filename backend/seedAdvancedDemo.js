// =============================================================
//  MediLink — Advanced 6-Month Demo Data Generator
//  Usage:  node seedAdvancedDemo.js
//  Clears ALL collections and seeds realistic 9-month data
//  (4.5 months past + 6 months future) in Indian HMS context.
// =============================================================
'use strict';
require('dotenv').config();
const mongoose = require('mongoose');

const User         = require('./models/User');
const Doctor       = require('./models/Doctor');
const Staff        = require('./models/Staff');
const Patient      = require('./models/Patient');
const Appointment  = require('./models/Appointment');
const Prescription = require('./models/Prescription');
const Medicine     = require('./models/Medicine');
const Billing      = require('./models/Billing');
const Ward         = require('./models/Ward');

// ── Time anchor (all dates relative to this) ─────────────────────────────────
const TODAY      = new Date('2026-05-15T00:00:00.000Z');
const PAST_START = new Date('2026-01-01T00:00:00.000Z'); // 4.5 months back
const FUTURE_END = new Date('2026-11-15T00:00:00.000Z'); // 6 months ahead

// ── Pure helpers ──────────────────────────────────────────────────────────────
const pick   = arr  => arr[Math.floor(Math.random() * arr.length)];
const rand   = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const chance = pct => Math.random() < pct;

function daysAgo(n) {
  const d = new Date(TODAY); d.setUTCDate(d.getUTCDate() - n); return d;
}
function daysAhead(n) {
  const d = new Date(TODAY); d.setUTCDate(d.getUTCDate() + n); return d;
}
function dateInRange(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function skipSunday(d) {
  const r = new Date(d);
  while (r.getDay() === 0) r.setUTCDate(r.getUTCDate() + 1);
  return r;
}
function skipSundayBack(d) {
  const r = new Date(d);
  while (r.getDay() === 0) r.setUTCDate(r.getUTCDate() - 1);
  return r;
}

const pastDate   = (minD = 1, maxD = 135) => skipSundayBack(daysAgo(rand(minD, maxD)));
const futureDate = (minD = 1, maxD = 184) => skipSunday(daysAhead(rand(minD, maxD)));

// Bill number — unique per call (counter-based to avoid collisions)
let _billSeq = 1;
const billNum = (d) => {
  const dt = d || new Date();
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `BILL-${yy}${mm}-${String(_billSeq++).padStart(4, '0')}`;
};

// ── Appointment time slots ────────────────────────────────────────────────────
const SLOTS = [
  ['09:00','09:30'], ['09:30','10:00'], ['10:00','10:30'], ['10:30','11:00'],
  ['11:00','11:30'], ['11:30','12:00'], ['14:00','14:30'], ['14:30','15:00'],
  ['15:00','15:30'], ['15:30','16:00'], ['16:00','16:30'], ['16:30','17:00'],
];
const pickSlot = () => {
  const s = pick(SLOTS);
  return { startTime: s[0], endTime: s[1] };
};

// ── Availability template ────────────────────────────────────────────────────
const AVAIL_ALL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => ({
  day,
  slots: [
    { startTime: '09:00', endTime: '12:00', isAvailable: true },
    { startTime: '14:00', endTime: '17:00', isAvailable: true },
  ],
}));

// =============================================================================
// STATIC DATA DEFINITIONS
// =============================================================================

// ── Doctors (13) ─────────────────────────────────────────────────────────────
const DOCTOR_USERS = [
  { name: 'Dr. Arjun Sharma',      email: 'doctor@medilink.com',         pw: 'doctor123',  phone: '9876543210', dob: new Date('1975-04-12'), gender: 'Male',   city: 'Mumbai'       },
  { name: 'Dr. Priya Verma',       email: 'priya.verma@medilink.com',    pw: 'Password123',phone: '9876543211', dob: new Date('1980-06-22'), gender: 'Female', city: 'Delhi'        },
  { name: 'Dr. Keshav Malhotra',   email: 'keshav.m@medilink.com',       pw: 'Password123',phone: '9876543212', dob: new Date('1972-09-05'), gender: 'Male',   city: 'Bangalore'    },
  { name: 'Dr. Aarav Patel',       email: 'aarav.p@medilink.com',        pw: 'Password123',phone: '9876543213', dob: new Date('1983-01-17'), gender: 'Male',   city: 'Ahmedabad'    },
  { name: 'Dr. Neha Gupta',        email: 'neha.g@medilink.com',         pw: 'Password123',phone: '9876543214', dob: new Date('1985-03-28'), gender: 'Female', city: 'Pune'         },
  { name: 'Dr. Rohan Khanna',      email: 'rohan.k@medilink.com',        pw: 'Password123',phone: '9876543215', dob: new Date('1978-11-14'), gender: 'Male',   city: 'Chennai'      },
  { name: 'Dr. Sunita Rao',        email: 'sunita.r@medilink.com',       pw: 'Password123',phone: '9876543216', dob: new Date('1981-07-09'), gender: 'Female', city: 'Hyderabad'    },
  { name: 'Dr. Manik Chandra',     email: 'manik.c@medilink.com',        pw: 'Password123',phone: '9876543217', dob: new Date('1976-02-25'), gender: 'Male',   city: 'Kolkata'      },
  { name: 'Dr. Anjali Singh',      email: 'anjali.s@medilink.com',       pw: 'Password123',phone: '9876543218', dob: new Date('1987-05-30'), gender: 'Female', city: 'Jaipur'       },
  { name: 'Dr. Vikram Nair',       email: 'vikram.n@medilink.com',       pw: 'Password123',phone: '9876543219', dob: new Date('1979-08-19'), gender: 'Male',   city: 'Kochi'        },
  { name: 'Dr. Kavita Iyer',       email: 'kavita.i@medilink.com',       pw: 'Password123',phone: '9876543220', dob: new Date('1982-12-03'), gender: 'Female', city: 'Coimbatore'   },
  { name: 'Dr. Rahul Bose',        email: 'rahul.b@medilink.com',        pw: 'Password123',phone: '9876543221', dob: new Date('1974-10-07'), gender: 'Male',   city: 'Bhopal'       },
  { name: 'Dr. Deepa Menon',       email: 'deepa.m@medilink.com',        pw: 'Password123',phone: '9876543222', dob: new Date('1986-04-16'), gender: 'Female', city: 'Trivandrum'   },
];

const DOCTOR_PROFILES = [
  { spec: 'Cardiologist',       qual: 'MD, DM Cardiology',            exp: 18, lic: 'KA/MED/2006/001', dept: 'Cardiology',       fee: 1200, rating: 4.8 },
  { spec: 'General Physician',  qual: 'MBBS, MD General Medicine',    exp: 13, lic: 'DL/MED/2010/002', dept: 'General Medicine', fee: 600,  rating: 4.6 },
  { spec: 'Neurologist',        qual: 'MD, DM Neurology',             exp: 21, lic: 'KA/MED/2002/003', dept: 'Neurology',        fee: 1500, rating: 4.9 },
  { spec: 'Orthopedic Surgeon', qual: 'MBBS, MS Orthopaedics',        exp: 15, lic: 'GJ/MED/2008/004', dept: 'Orthopedics',      fee: 1000, rating: 4.7 },
  { spec: 'Dermatologist',      qual: 'MBBS, MD Dermatology',         exp: 12, lic: 'MH/MED/2011/005', dept: 'Dermatology',      fee: 800,  rating: 4.5 },
  { spec: 'Pediatrician',       qual: 'MBBS, MD Pediatrics',          exp: 16, lic: 'TN/MED/2007/006', dept: 'Pediatrics',       fee: 700,  rating: 4.8 },
  { spec: 'Gastroenterologist', qual: 'MD, DM Gastroenterology',      exp: 14, lic: 'TS/MED/2009/007', dept: 'Gastroenterology', fee: 1100, rating: 4.6 },
  { spec: 'General Physician',  qual: 'MBBS, MD General Medicine',    exp: 22, lic: 'WB/MED/2001/008', dept: 'General Medicine', fee: 500,  rating: 4.7 },
  { spec: 'Dermatologist',      qual: 'MBBS, DNB Dermatology',        exp: 11, lic: 'RJ/MED/2012/009', dept: 'Dermatology',      fee: 750,  rating: 4.4 },
  { spec: 'Cardiologist',       qual: 'MD, DM Cardiology',            exp: 19, lic: 'KL/MED/2004/010', dept: 'Cardiology',       fee: 1300, rating: 4.9 },
  { spec: 'Neurologist',        qual: 'MD, DM Neurology',             exp: 16, lic: 'TN/MED/2007/011', dept: 'Neurology',        fee: 1400, rating: 4.7 },
  { spec: 'Pediatrician',       qual: 'MBBS, DCH, MD Pediatrics',     exp: 20, lic: 'MP/MED/2003/012', dept: 'Pediatrics',       fee: 650,  rating: 4.8 },
  { spec: 'Orthopedic Surgeon', qual: 'MBBS, MS, MCh Orthopaedics',   exp: 17, lic: 'KL/MED/2006/013', dept: 'Orthopedics',      fee: 950,  rating: 4.6 },
];

// ── Staff (13) ───────────────────────────────────────────────────────────────
const STAFF_USERS = [
  { name: 'Ravi Mehta',       email: 'receptionist@medilink.com', pw: 'staff123',   phone: '9811111101', sub: 'Receptionist',   gender: 'Male',   city: 'Mumbai'    },
  { name: 'Sunita Kumari',    email: 'nurse@medilink.com',        pw: 'staff123',   phone: '9811111102', sub: 'Nurse',           gender: 'Female', city: 'Delhi'     },
  { name: 'Anil Sharma',      email: 'pharmacist@medilink.com',   pw: 'staff123',   phone: '9811111103', sub: 'Pharmacist',      gender: 'Male',   city: 'Pune'      },
  { name: 'Pooja Nair',       email: 'lab@medilink.com',          pw: 'staff123',   phone: '9811111104', sub: 'Lab Technician',  gender: 'Female', city: 'Chennai'   },
  { name: 'Suresh Pandey',    email: 'ward@medilink.com',         pw: 'staff123',   phone: '9811111105', sub: 'Ward Manager',    gender: 'Male',   city: 'Lucknow'   },
  { name: 'Neelam Agarwal',   email: 'neelam.a@medilink.com',     pw: 'Password123',phone: '9811111106', sub: 'Receptionist',   gender: 'Female', city: 'Bangalore' },
  { name: 'Deepak Joshi',     email: 'deepak.j@medilink.com',     pw: 'Password123',phone: '9811111107', sub: 'Receptionist',   gender: 'Male',   city: 'Jaipur'    },
  { name: 'Anitha Thomas',    email: 'anitha.t@medilink.com',     pw: 'Password123',phone: '9811111108', sub: 'Nurse',           gender: 'Female', city: 'Kochi'     },
  { name: 'Lalitha Krishnan', email: 'lalitha.k@medilink.com',    pw: 'Password123',phone: '9811111109', sub: 'Nurse',           gender: 'Female', city: 'Hyderabad' },
  { name: 'Ganesh Patil',     email: 'ganesh.p@medilink.com',     pw: 'Password123',phone: '9811111110', sub: 'Pharmacist',      gender: 'Male',   city: 'Nashik'    },
  { name: 'Meera Pillai',     email: 'meera.pi@medilink.com',     pw: 'Password123',phone: '9811111111', sub: 'Pharmacist',      gender: 'Female', city: 'Trivandrum'},
  { name: 'Rajan Dubey',      email: 'rajan.d@medilink.com',      pw: 'Password123',phone: '9811111112', sub: 'Lab Technician',  gender: 'Male',   city: 'Varanasi'  },
  { name: 'Indira Yadav',     email: 'indira.y@medilink.com',     pw: 'Password123',phone: '9811111113', sub: 'Ward Manager',    gender: 'Female', city: 'Patna'     },
];
const STAFF_PROFILES = [
  { desig: 'Senior Receptionist',  dept: 'Administration', shift: 'Morning'    },
  { desig: 'Head Nurse',           dept: 'ICU',            shift: 'Rotational' },
  { desig: 'Senior Pharmacist',    dept: 'Pharmacy',       shift: 'Morning'    },
  { desig: 'Lab In-charge',        dept: 'Laboratory',     shift: 'Morning'    },
  { desig: 'Ward Manager',         dept: 'General Ward',   shift: 'Morning'    },
  { desig: 'Receptionist',         dept: 'Administration', shift: 'Evening'    },
  { desig: 'Receptionist',         dept: 'Administration', shift: 'Night'      },
  { desig: 'Staff Nurse',          dept: 'General Ward',   shift: 'Morning'    },
  { desig: 'ICU Nurse',            dept: 'ICU',            shift: 'Night'      },
  { desig: 'Pharmacist',           dept: 'Pharmacy',       shift: 'Evening'    },
  { desig: 'Pharmacist',           dept: 'Pharmacy',       shift: 'Night'      },
  { desig: 'Lab Technician',       dept: 'Laboratory',     shift: 'Evening'    },
  { desig: 'Ward In-charge',       dept: 'Private Ward',   shift: 'Evening'    },
];

// ── Patients (50) ────────────────────────────────────────────────────────────
const PATIENT_DATA = [
  // ── Demo account ─────────────────────────────────────────────────────────
  { name: 'Rahul Verma',          email: 'patient@medilink.com',      pw: 'patient123', phone: '9900001001', dob: new Date('1990-03-15'), gender: 'Male',   city: 'Mumbai',       bg: 'O+',  ins: true  },
  // ── Additional patients ───────────────────────────────────────────────────
  { name: 'Priya Agarwal',        email: 'priya.ag@patient.com',      pw: 'Password123',phone: '9900001002', dob: new Date('1988-07-22'), gender: 'Female', city: 'Delhi',        bg: 'A+',  ins: true  },
  { name: 'Suresh Kumar',         email: 'suresh.k@patient.com',      pw: 'Password123',phone: '9900001003', dob: new Date('1965-11-08'), gender: 'Male',   city: 'Pune',         bg: 'B+',  ins: false },
  { name: 'Lakshmi Devi',         email: 'lakshmi.d@patient.com',     pw: 'Password123',phone: '9900001004', dob: new Date('1972-02-14'), gender: 'Female', city: 'Chennai',      bg: 'AB+', ins: false },
  { name: 'Amit Thakur',          email: 'amit.t@patient.com',        pw: 'Password123',phone: '9900001005', dob: new Date('1995-09-30'), gender: 'Male',   city: 'Bangalore',    bg: 'O-',  ins: false },
  { name: 'Kavitha Nair',         email: 'kavitha.n@patient.com',     pw: 'Password123',phone: '9900001006', dob: new Date('1982-05-17'), gender: 'Female', city: 'Kochi',        bg: 'B-',  ins: true  },
  { name: 'Rajesh Mishra',        email: 'rajesh.m@patient.com',      pw: 'Password123',phone: '9900001007', dob: new Date('1958-12-25'), gender: 'Male',   city: 'Lucknow',      bg: 'A-',  ins: true  },
  { name: 'Ananya Sharma',        email: 'ananya.s@patient.com',      pw: 'Password123',phone: '9900001008', dob: new Date('2000-04-10'), gender: 'Female', city: 'Jaipur',       bg: 'AB-', ins: false },
  { name: 'Vikash Singh',         email: 'vikash.s@patient.com',      pw: 'Password123',phone: '9900001009', dob: new Date('1978-08-03'), gender: 'Male',   city: 'Patna',        bg: 'O+',  ins: false },
  { name: 'Meena Patel',          email: 'meena.p@patient.com',       pw: 'Password123',phone: '9900001010', dob: new Date('1992-01-19'), gender: 'Female', city: 'Ahmedabad',    bg: 'A+',  ins: true  },
  { name: 'Dinesh Chaudhary',     email: 'dinesh.c@patient.com',      pw: 'Password123',phone: '9900001011', dob: new Date('1970-06-28'), gender: 'Male',   city: 'Agra',         bg: 'B+',  ins: false },
  { name: 'Geeta Pillai',         email: 'geeta.pi@patient.com',      pw: 'Password123',phone: '9900001012', dob: new Date('1960-10-11'), gender: 'Female', city: 'Hyderabad',    bg: 'O+',  ins: true  },
  { name: 'Naresh Yadav',         email: 'naresh.y@patient.com',      pw: 'Password123',phone: '9900001013', dob: new Date('1985-03-07'), gender: 'Male',   city: 'Kanpur',       bg: 'AB+', ins: false },
  { name: 'Usha Reddy',           email: 'usha.r@patient.com',        pw: 'Password123',phone: '9900001014', dob: new Date('1967-09-14'), gender: 'Female', city: 'Visakhapatnam',bg: 'A+',  ins: true  },
  { name: 'Santosh Jain',         email: 'santosh.j@patient.com',     pw: 'Password123',phone: '9900001015', dob: new Date('1989-12-02'), gender: 'Male',   city: 'Indore',       bg: 'B+',  ins: false },
  { name: 'Rekha Kumari',         email: 'rekha.k@patient.com',       pw: 'Password123',phone: '9900001016', dob: new Date('1975-04-20'), gender: 'Female', city: 'Bhopal',       bg: 'O-',  ins: false },
  { name: 'Arun Mehta',           email: 'arun.me@patient.com',       pw: 'Password123',phone: '9900001017', dob: new Date('1993-07-16'), gender: 'Male',   city: 'Surat',        bg: 'A-',  ins: false },
  { name: 'Bindu Thomas',         email: 'bindu.t@patient.com',       pw: 'Password123',phone: '9900001018', dob: new Date('1969-02-08'), gender: 'Female', city: 'Thrissur',     bg: 'B-',  ins: true  },
  { name: 'Manoj Gupta',          email: 'manoj.g@patient.com',       pw: 'Password123',phone: '9900001019', dob: new Date('1981-11-27'), gender: 'Male',   city: 'Nagpur',       bg: 'AB-', ins: false },
  { name: 'Sarita Sharma',        email: 'sarita.sh@patient.com',     pw: 'Password123',phone: '9900001020', dob: new Date('1956-08-05'), gender: 'Female', city: 'Varanasi',     bg: 'O+',  ins: true  },
  { name: 'Ravi Krishnamurthy',   email: 'ravi.kr@patient.com',       pw: 'Password123',phone: '9900001021', dob: new Date('1998-01-31'), gender: 'Male',   city: 'Coimbatore',   bg: 'A+',  ins: false },
  { name: 'Pooja Dubey',          email: 'pooja.du@patient.com',      pw: 'Password123',phone: '9900001022', dob: new Date('1990-05-25'), gender: 'Female', city: 'Raipur',       bg: 'B+',  ins: false },
  { name: 'Harish Kapoor',        email: 'harish.ka@patient.com',     pw: 'Password123',phone: '9900001023', dob: new Date('1962-03-13'), gender: 'Male',   city: 'Amritsar',     bg: 'O+',  ins: true  },
  { name: 'Sudha Iyer',           email: 'sudha.iy@patient.com',      pw: 'Password123',phone: '9900001024', dob: new Date('1977-10-09'), gender: 'Female', city: 'Madurai',      bg: 'AB+', ins: false },
  { name: 'Kiran Shinde',         email: 'kiran.sh@patient.com',      pw: 'Password123',phone: '9900001025', dob: new Date('1994-06-18'), gender: 'Male',   city: 'Nasik',        bg: 'A+',  ins: false },
  { name: 'Vandana Tiwari',       email: 'vandana.t@patient.com',     pw: 'Password123',phone: '9900001026', dob: new Date('1983-09-04'), gender: 'Female', city: 'Allahabad',    bg: 'B+',  ins: true  },
  { name: 'Prasad Rao',           email: 'prasad.r@patient.com',      pw: 'Password123',phone: '9900001027', dob: new Date('1973-04-22'), gender: 'Male',   city: 'Vijayawada',   bg: 'O-',  ins: false },
  { name: 'Shanti Devi',          email: 'shanti.d@patient.com',      pw: 'Password123',phone: '9900001028', dob: new Date('1949-12-30'), gender: 'Female', city: 'Bareilly',     bg: 'A-',  ins: false },
  { name: 'Nitin Pandey',         email: 'nitin.pa@patient.com',      pw: 'Password123',phone: '9900001029', dob: new Date('1987-07-11'), gender: 'Male',   city: 'Jodhpur',      bg: 'B-',  ins: false },
  { name: 'Geetha Balan',         email: 'geetha.b@patient.com',      pw: 'Password123',phone: '9900001030', dob: new Date('1964-01-06'), gender: 'Female', city: 'Tirunelveli',  bg: 'AB+', ins: true  },
  { name: 'Kartik Arora',         email: 'kartik.a@patient.com',      pw: 'Password123',phone: '9900001031', dob: new Date('2002-08-14'), gender: 'Male',   city: 'Chandigarh',   bg: 'O+',  ins: false },
  { name: 'Nandini Ghosh',        email: 'nandini.g@patient.com',     pw: 'Password123',phone: '9900001032', dob: new Date('1979-03-28'), gender: 'Female', city: 'Kolkata',      bg: 'A+',  ins: true  },
  // ── 18 new patients (33-50) ───────────────────────────────────────────────
  { name: 'Tarun Bajaj',          email: 'tarun.ba@patient.com',      pw: 'Password123',phone: '9900001033', dob: new Date('1991-06-14'), gender: 'Male',   city: 'Chandigarh',   bg: 'B+',  ins: false },
  { name: 'Smita Kulkarni',       email: 'smita.ku@patient.com',      pw: 'Password123',phone: '9900001034', dob: new Date('1984-11-03'), gender: 'Female', city: 'Kolhapur',     bg: 'A+',  ins: true  },
  { name: 'Mukesh Srivastava',    email: 'mukesh.sr@patient.com',     pw: 'Password123',phone: '9900001035', dob: new Date('1966-07-19'), gender: 'Male',   city: 'Gorakhpur',    bg: 'O+',  ins: false },
  { name: 'Rani Bhadra',          email: 'rani.bh@patient.com',       pw: 'Password123',phone: '9900001036', dob: new Date('1970-03-25'), gender: 'Female', city: 'Durgapur',     bg: 'B-',  ins: false },
  { name: 'Ranjit Patnaik',       email: 'ranjit.pa@patient.com',     pw: 'Password123',phone: '9900001037', dob: new Date('1976-09-08'), gender: 'Male',   city: 'Bhubaneswar',  bg: 'AB+', ins: true  },
  { name: 'Girija Menon',         email: 'girija.me@patient.com',     pw: 'Password123',phone: '9900001038', dob: new Date('1961-05-31'), gender: 'Female', city: 'Kozhikode',    bg: 'O+',  ins: false },
  { name: 'Hemant Chowdhury',     email: 'hemant.ch@patient.com',     pw: 'Password123',phone: '9900001039', dob: new Date('1988-12-17'), gender: 'Male',   city: 'Siliguri',     bg: 'A-',  ins: false },
  { name: 'Nirmala Singh',        email: 'nirmala.si@patient.com',    pw: 'Password123',phone: '9900001040', dob: new Date('1955-08-22'), gender: 'Female', city: 'Agra',         bg: 'O-',  ins: true  },
  { name: 'Balaji Subramaniam',   email: 'balaji.su@patient.com',     pw: 'Password123',phone: '9900001041', dob: new Date('1993-02-07'), gender: 'Male',   city: 'Salem',        bg: 'B+',  ins: false },
  { name: 'Sushila Agrawal',      email: 'sushila.ag@patient.com',    pw: 'Password123',phone: '9900001042', dob: new Date('1968-10-15'), gender: 'Female', city: 'Bikaner',      bg: 'A+',  ins: false },
  { name: 'Jayesh Panchal',       email: 'jayesh.pa@patient.com',     pw: 'Password123',phone: '9900001043', dob: new Date('1982-04-29'), gender: 'Male',   city: 'Vadodara',     bg: 'AB-', ins: true  },
  { name: 'Kaveri Krishnan',      email: 'kaveri.kr@patient.com',     pw: 'Password123',phone: '9900001044', dob: new Date('1974-01-18'), gender: 'Female', city: 'Mysuru',       bg: 'O+',  ins: false },
  { name: 'Mohammad Iqbal',       email: 'mohd.iq@patient.com',       pw: 'Password123',phone: '9900001045', dob: new Date('1980-07-04'), gender: 'Male',   city: 'Hyderabad',    bg: 'B+',  ins: true  },
  { name: 'Fatima Shaikh',        email: 'fatima.sh@patient.com',     pw: 'Password123',phone: '9900001046', dob: new Date('1990-03-11'), gender: 'Female', city: 'Pune',         bg: 'A+',  ins: false },
  { name: 'Rajendra Prasad',      email: 'rajendra.pr@patient.com',   pw: 'Password123',phone: '9900001047', dob: new Date('1952-11-27'), gender: 'Male',   city: 'Patna',        bg: 'O+',  ins: false },
  { name: 'Deepika Chatterjee',   email: 'deepika.ch@patient.com',    pw: 'Password123',phone: '9900001048', dob: new Date('1997-08-09'), gender: 'Female', city: 'Kolkata',      bg: 'AB+', ins: true  },
  { name: 'Maninder Kaur',        email: 'maninder.ka@patient.com',   pw: 'Password123',phone: '9900001049', dob: new Date('1985-05-23'), gender: 'Female', city: 'Amritsar',     bg: 'B+',  ins: false },
  { name: 'Satish Kamble',        email: 'satish.ka@patient.com',     pw: 'Password123',phone: '9900001050', dob: new Date('1963-09-14'), gender: 'Male',   city: 'Solapur',      bg: 'O-',  ins: true  },
];

// ── Medicines (30) ──────────────────────────────────────────────────────────
const MEDICINES_RAW = [
  { name: 'Amoxicillin 500mg',        gen: 'Amoxicillin',          mfg: 'Cipla Ltd',              cat: 'Antibiotic',        form: 'Capsule',   str: '500mg',    price: 12,   stock: 500,  reorder: 100, ahead: 365  },
  { name: 'Azithromycin 500mg',       gen: 'Azithromycin',         mfg: 'Sun Pharma',             cat: 'Antibiotic',        form: 'Tablet',    str: '500mg',    price: 28,   stock: 300,  reorder: 60,  ahead: 400  },
  { name: 'Cephalexin 250mg',         gen: 'Cephalexin',           mfg: 'Lupin Ltd',              cat: 'Antibiotic',        form: 'Capsule',   str: '250mg',    price: 9,    stock: 450,  reorder: 80,  ahead: 300  },
  { name: 'Ciprofloxacin 500mg',      gen: 'Ciprofloxacin HCl',    mfg: 'Cipla Ltd',              cat: 'Antibiotic',        form: 'Tablet',    str: '500mg',    price: 14,   stock: 380,  reorder: 75,  ahead: 320  },
  { name: 'Paracetamol 650mg',        gen: 'Paracetamol',          mfg: "Dr. Reddy's",            cat: 'Analgesic',         form: 'Tablet',    str: '650mg',    price: 2,    stock: 2000, reorder: 500, ahead: 550  },
  { name: 'Ibuprofen 400mg',          gen: 'Ibuprofen',            mfg: 'Abbott India',           cat: 'Analgesic',         form: 'Tablet',    str: '400mg',    price: 5,    stock: 800,  reorder: 150, ahead: 480  },
  { name: 'Diclofenac 50mg',          gen: 'Diclofenac Sodium',    mfg: 'Novartis India',         cat: 'Anti-inflammatory', form: 'Tablet',    str: '50mg',     price: 4,    stock: 600,  reorder: 100, ahead: 420  },
  { name: 'Tramadol 50mg',            gen: 'Tramadol HCl',         mfg: 'Mankind Pharma',         cat: 'Analgesic',         form: 'Tablet',    str: '50mg',     price: 12,   stock: 150,  reorder: 30,  ahead: 290  },
  { name: 'Amlodipine 5mg',           gen: 'Amlodipine Besylate',  mfg: 'Pfizer India',           cat: 'Antihypertensive',  form: 'Tablet',    str: '5mg',      price: 6,    stock: 700,  reorder: 120, ahead: 500  },
  { name: 'Telmisartan 40mg',         gen: 'Telmisartan',          mfg: 'Glenmark Pharma',        cat: 'Antihypertensive',  form: 'Tablet',    str: '40mg',     price: 8,    stock: 550,  reorder: 100, ahead: 460  },
  { name: 'Atenolol 50mg',            gen: 'Atenolol',             mfg: 'Cipla Ltd',              cat: 'Cardiovascular',    form: 'Tablet',    str: '50mg',     price: 7,    stock: 400,  reorder: 80,  ahead: 390  },
  { name: 'Atorvastatin 10mg',        gen: 'Atorvastatin Calcium', mfg: 'Ranbaxy Labs',           cat: 'Cardiovascular',    form: 'Tablet',    str: '10mg',     price: 11,   stock: 600,  reorder: 100, ahead: 510  },
  { name: 'Aspirin 75mg',             gen: 'Acetylsalicylic Acid', mfg: 'Bayer India',            cat: 'Cardiovascular',    form: 'Tablet',    str: '75mg',     price: 2,    stock: 1500, reorder: 300, ahead: 580  },
  { name: 'Clopidogrel 75mg',         gen: 'Clopidogrel',          mfg: 'Sun Pharma',             cat: 'Cardiovascular',    form: 'Tablet',    str: '75mg',     price: 18,   stock: 300,  reorder: 60,  ahead: 430  },
  { name: 'Metformin 500mg',          gen: 'Metformin HCl',        mfg: 'USV Ltd',                cat: 'Antidiabetic',      form: 'Tablet',    str: '500mg',    price: 3,    stock: 1200, reorder: 200, ahead: 600  },
  { name: 'Glimepiride 2mg',          gen: 'Glimepiride',          mfg: 'Sanofi India',           cat: 'Antidiabetic',      form: 'Tablet',    str: '2mg',      price: 9,    stock: 400,  reorder: 80,  ahead: 350  },
  { name: 'Cetirizine 10mg',          gen: 'Cetirizine HCl',       mfg: 'Mankind Pharma',         cat: 'Antihistamine',     form: 'Tablet',    str: '10mg',     price: 3,    stock: 900,  reorder: 150, ahead: 440  },
  { name: 'Montelukast 10mg',         gen: 'Montelukast Sodium',   mfg: 'Merck India',            cat: 'Respiratory',       form: 'Tablet',    str: '10mg',     price: 18,   stock: 300,  reorder: 60,  ahead: 380  },
  { name: 'Salbutamol Inhaler 100mcg',gen: 'Salbutamol',           mfg: 'GlaxoSmithKline India',  cat: 'Respiratory',       form: 'Inhaler',   str: '100mcg',   price: 220,  stock: 80,   reorder: 20,  ahead: 270  },
  { name: 'Omeprazole 20mg',          gen: 'Omeprazole',           mfg: 'AstraZeneca India',      cat: 'Gastrointestinal',  form: 'Capsule',   str: '20mg',     price: 7,    stock: 800,  reorder: 150, ahead: 520  },
  { name: 'Pantoprazole 40mg',        gen: 'Pantoprazole',         mfg: 'Zydus Healthcare',       cat: 'Gastrointestinal',  form: 'Tablet',    str: '40mg',     price: 10,   stock: 600,  reorder: 100, ahead: 450  },
  { name: 'Domperidone 10mg',         gen: 'Domperidone',          mfg: 'Alkem Labs',             cat: 'Gastrointestinal',  form: 'Tablet',    str: '10mg',     price: 4,    stock: 500,  reorder: 80,  ahead: 340  },
  { name: 'Ondansetron 4mg Inj',      gen: 'Ondansetron HCl',      mfg: 'GlaxoSmithKline India',  cat: 'Gastrointestinal',  form: 'Injection', str: '4mg/2ml',  price: 65,   stock: 100,  reorder: 20,  ahead: 180  },
  { name: 'Alprazolam 0.25mg',        gen: 'Alprazolam',           mfg: 'Torrent Pharma',         cat: 'Neurological',      form: 'Tablet',    str: '0.25mg',   price: 5,    stock: 200,  reorder: 40,  ahead: 310  },
  { name: 'Pregabalin 75mg',          gen: 'Pregabalin',           mfg: 'Intas Pharma',           cat: 'Neurological',      form: 'Capsule',   str: '75mg',     price: 22,   stock: 250,  reorder: 50,  ahead: 280  },
  { name: 'Betamethasone Cream',      gen: 'Betamethasone',        mfg: 'GlaxoSmithKline India',  cat: 'Dermatological',    form: 'Cream',     str: '0.05%',    price: 45,   stock: 120,  reorder: 25,  ahead: 270  },
  { name: 'Clotrimazole Cream 1%',    gen: 'Clotrimazole',         mfg: 'Bayer Zydus',            cat: 'Dermatological',    form: 'Cream',     str: '1%',       price: 38,   stock: 150,  reorder: 30,  ahead: 360  },
  { name: 'Ambroxol Syrup 30mg/5ml',  gen: 'Ambroxol HCl',        mfg: 'Boehringer Ingelheim',   cat: 'Respiratory',       form: 'Syrup',     str: '30mg/5ml', price: 55,   stock: 200,  reorder: 40,  ahead: 200  },
  // ── Critical / expiring scenarios ─────────────────────────────────────────
  { name: 'Insulin Glargine 100U/ml', gen: 'Insulin Glargine',     mfg: 'Sanofi India',           cat: 'Antidiabetic',      form: 'Injection', str: '100U/ml',  price: 1200, stock: 8,    reorder: 15,  ahead: 90   },
  { name: 'Cefixime 200mg',           gen: 'Cefixime',             mfg: 'Cadila Healthcare',      cat: 'Antibiotic',        form: 'Tablet',    str: '200mg',    price: 32,   stock: 60,   reorder: 50,  ahead: 20   },
  { name: 'Ranitidine 150mg',         gen: 'Ranitidine HCl',       mfg: 'GSK India',              cat: 'Gastrointestinal',  form: 'Tablet',    str: '150mg',    price: 4,    stock: 200,  reorder: 50,  ahead: -15  },
];

// ── Diagnosis / symptoms library ─────────────────────────────────────────────
const DIAGS = [
  'Viral Upper Respiratory Infection',   'Essential Hypertension',
  'Type 2 Diabetes Mellitus',            'Migraine without Aura',
  'Acute Gastritis',                     'Lumbar Spondylosis',
  'Atopic Dermatitis',                   'Seasonal Allergic Rhinitis',
  'Anxiety Disorder (GAD)',              'Ischemic Heart Disease',
  'Peripheral Neuropathy',               'Bronchial Asthma',
  'Iron Deficiency Anaemia',             'Hypothyroidism',
  'Tension Headache',                    'Acute Pharyngitis',
  'Psoriasis vulgaris',                  'Osteoarthritis of Knee',
  'Acute Gastroenteritis',               'Dyslipidaemia',
  'Cervical Spondylosis',                'Urinary Tract Infection',
  'Acute Sinusitis',                     'Vertigo (BPPV)',
  'Chronic Kidney Disease Stage 2',      'Fatty Liver Disease',
];
const SYMPTOMS = [
  'Fever, body ache, sore throat',
  'Headache, dizziness, elevated BP 150/95',
  'Increased thirst, frequent urination, fatigue',
  'Throbbing unilateral headache, nausea, photophobia',
  'Burning epigastric pain, bloating, nausea after meals',
  'Lower back pain, stiffness, radiation to left leg',
  'Dry itchy skin, erythematous rash, excoriation marks',
  'Sneezing, watery eyes, nasal congestion — seasonal',
  'Excessive worry, restlessness, sleep disturbance',
  'Chest pain on exertion, breathlessness, palpitations',
  'Numbness and tingling in both feet, burning sensation',
  'Nocturnal cough, wheezing, chest tightness',
  'Fatigue, pallor, cold extremities, dyspnoea on exertion',
  'Cold intolerance, weight gain, hair loss, constipation',
  'Bilateral frontal headache, neck stiffness, stress-related',
  'Sore throat, odynophagia, fever 100.4°F, tonsillar exudate',
  'Scaly plaques on scalp and elbows, pruritus',
  'Bilateral knee pain, crepitus, morning stiffness < 30 min',
  'Loose stools 5-6 times/day, abdominal cramps, mild fever',
  'Elevated cholesterol, no symptoms — routine checkup',
  'Neck pain, stiffness, radiation to right arm, tingling',
  'Burning micturition, frequency, suprapubic pain, low-grade fever',
  'Nasal congestion, facial pain and pressure, post-nasal drip',
  'Sudden onset rotatory vertigo, nausea, positional aggravation',
  'Elevated creatinine, pedal oedema, reduced urine output',
  'Mild RUQ discomfort, elevated liver enzymes — routine scan',
];
const LAB_TESTS = ['CBC', 'LFT', 'RFT', 'Blood Sugar F/PP', 'Lipid Profile', 'Thyroid Profile', 'Urine Routine', 'HbA1c', 'ECG', 'X-Ray', 'Ultrasound Abdomen', '2D Echo', 'MRI Brain'];

// ── Insurance providers ──────────────────────────────────────────────────────
const INS_PROVIDERS = ['Star Health Insurance', 'HDFC Ergo Health', 'New India Assurance', 'Niva Bupa Health', 'ICICI Lombard Health'];

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================
async function seed() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  MediLink Advanced Demo Seeder — 6-Month Data     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  // ── Connect ──────────────────────────────────────────────────────────────
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  // ── Clear ────────────────────────────────────────────────────────────────
  process.stdout.write('🗑   Clearing all collections … ');
  await Promise.all([
    User.deleteMany({}), Doctor.deleteMany({}), Staff.deleteMany({}),
    Patient.deleteMany({}), Appointment.deleteMany({}), Prescription.deleteMany({}),
    Medicine.deleteMany({}), Billing.deleteMany({}), Ward.deleteMany({}),
  ]);
  console.log('done\n');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ADMIN
  // ─────────────────────────────────────────────────────────────────────────
  process.stdout.write('👤  Creating admin … ');
  const adminUser = await User.create({
    name: 'Admin MediLink', email: 'admin@medilink.com', password: 'admin123',
    role: 'Admin', phone: '9800000000', dateOfBirth: new Date('1982-06-15'), gender: 'Male',
    address: { street: '1 Hospital Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' },
    isActive: true,
  });
  console.log(`done (${adminUser._id})\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DOCTORS (13 + profiles)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('👨‍⚕️  Creating doctors …');
  const doctorUsers    = [];
  const doctorProfiles = [];
  for (let i = 0; i < DOCTOR_USERS.length; i++) {
    const du = DOCTOR_USERS[i];
    const dp = DOCTOR_PROFILES[i];
    const u  = await User.create({
      name: du.name, email: du.email, password: du.pw,
      role: 'Doctor', phone: du.phone, dateOfBirth: du.dob, gender: du.gender,
      address: { city: du.city, country: 'India' }, isActive: true,
    });
    const doc = await Doctor.create({
      userId: u._id, specialization: dp.spec, qualification: dp.qual,
      experience: dp.exp, licenseNumber: dp.lic, department: dp.dept,
      consultationFee: dp.fee, rating: dp.rating, totalRatings: rand(50, 300),
      isAvailable: true, availability: AVAIL_ALL,
    });
    doctorUsers.push(u);
    doctorProfiles.push(doc);
    console.log(`   ✓ ${du.name.padEnd(28)} → ${dp.dept} (₹${dp.fee})`);
  }
  console.log();

  // ─────────────────────────────────────────────────────────────────────────
  // 3. STAFF (13 + profiles)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('👩‍⚕️  Creating staff …');
  const staffUsers = [];
  for (let i = 0; i < STAFF_USERS.length; i++) {
    const su = STAFF_USERS[i];
    const sp = STAFF_PROFILES[i];
    const u  = await User.create({
      name: su.name, email: su.email, password: su.pw,
      role: 'Staff', subRole: su.sub, phone: su.phone,
      dateOfBirth: new Date(`${rand(1975, 1993)}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`),
      gender: su.gender,
      address: { city: su.city, country: 'India' }, isActive: true,
    });
    await Staff.create({
      userId: u._id, designation: sp.desig, department: sp.dept,
      qualification: `BSc, Diploma in ${su.sub}`,
      joiningDate: daysAgo(rand(180, 2000)), employmentType: 'Full-Time', shift: sp.shift,
      salary: { basic: rand(28000, 60000), allowances: 5000, total: rand(33000, 65000) },
      isActive: true,
    });
    staffUsers.push(u);
    console.log(`   ✓ ${su.name.padEnd(22)} → ${su.sub}`);
  }
  console.log();

  // The pharmacist user (for dispensedBy references)
  const pharmacistUser = staffUsers.find((_, i) => STAFF_USERS[i].sub === 'Pharmacist') || adminUser;

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PATIENTS (50 + profiles with history, insurance, lab reports)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🧑  Creating 50 patients …');
  const CONDITIONS = [
    'Hypertension', 'Diabetes Mellitus Type 2', 'Asthma', 'Hypothyroidism',
    'Migraine', 'Chronic Back Pain', 'Gastritis', 'Anxiety Disorder',
    'Anaemia', 'Hyperlipidaemia', 'Chronic Kidney Disease', 'GERD',
    'Osteoarthritis', 'Coronary Artery Disease', 'Psoriasis',
  ];
  const ALLERGIES = ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Peanuts', 'Dust', 'Pollen', 'Latex', 'Shellfish', 'Iodine contrast'];
  const LAB_RESULT_TYPES = [
    { t: 'Complete Blood Count (CBC)', r: '8.2-10.4 g/dL Hb; WBC 7200/µL; Plt 2.1L/µL', ref: 'Hb 12-16 g/dL; WBC 4000-11000; Plt 1.5-4.5 L/µL' },
    { t: 'Fasting Blood Sugar',        r: '126 mg/dL',     ref: '70-100 mg/dL' },
    { t: 'HbA1c',                      r: '7.2%',          ref: '< 5.7%' },
    { t: 'Lipid Profile',              r: 'TC 220, LDL 148, HDL 38, TG 185 mg/dL', ref: 'TC < 200, LDL < 130, HDL > 40, TG < 150 mg/dL' },
    { t: 'Thyroid Function (TSH)',      r: '6.8 µIU/mL',   ref: '0.5–5 µIU/mL' },
    { t: 'Renal Function',             r: 'Creatinine 1.4 mg/dL; BUN 22 mg/dL', ref: 'Cr 0.6-1.2; BUN 7-20 mg/dL' },
    { t: 'Liver Function (LFT)',        r: 'ALT 42 U/L; AST 38 U/L; ALP 95 U/L', ref: 'ALT 7-56; AST 10-40; ALP 44-147 U/L' },
    { t: 'Urine Routine',              r: 'Protein trace; RBC 2-4/HPF; Pus cells 6-8/HPF', ref: 'Protein nil; RBC 0-2; Pus cells 0-5/HPF' },
    { t: 'X-Ray Chest PA View',        r: 'Cardiomegaly present; mild pleural effusion right', ref: 'Normal cardiothoracic ratio < 0.5' },
    { t: 'Ultrasound Abdomen',         r: 'Mildly enlarged liver with increased echogenicity (fatty liver Grade 1)', ref: 'Normal' },
  ];

  const patientUsers    = [];
  const patientProfiles = [];

  for (let i = 0; i < PATIENT_DATA.length; i++) {
    const pd = PATIENT_DATA[i];
    const u  = await User.create({
      name: pd.name, email: pd.email, password: pd.pw,
      role: 'Patient', phone: pd.phone, dateOfBirth: pd.dob, gender: pd.gender,
      address: { city: pd.city, country: 'India' }, isActive: true,
    });
    patientUsers.push(u);

    // Construct medical history (30% chance of 1-2 conditions)
    const numConditions = chance(0.3) ? rand(1, 2) : 0;
    const medHistory = [];
    const usedConds  = new Set();
    for (let c = 0; c < numConditions; c++) {
      let cond;
      do { cond = pick(CONDITIONS); } while (usedConds.has(cond));
      usedConds.add(cond);
      medHistory.push({
        condition:    cond,
        diagnosedDate: daysAgo(rand(60, 1800)),
        status:        chance(0.6) ? 'Chronic' : 'Active',
        notes:         'Managed with medication and lifestyle changes.',
      });
    }

    // Lab reports (40% of patients get 1-2 historical reports)
    const labReports = [];
    if (chance(0.4)) {
      const numReports = rand(1, 2);
      for (let lr = 0; lr < numReports; lr++) {
        const lrt = pick(LAB_RESULT_TYPES);
        const reportDate = daysAgo(rand(14, 365));
        labReports.push({
          testName:       lrt.t,
          testType:       lrt.t.includes('X-Ray') || lrt.t.includes('Ultra') ? 'Imaging' : 'Blood Test',
          lab:            pick(['MediLink Diagnostics', 'City Pathology Lab', 'Dr. Lal PathLabs', 'Thyrocare']),
          testDate:       new Date(reportDate.getTime() - 1000 * 60 * 60 * 24),
          reportDate,
          result:         lrt.r,
          referenceRange: lrt.ref,
          status:         chance(0.3) ? 'Abnormal' : 'Normal',
          notes:          chance(0.4) ? 'Repeat after 3 months' : '',
        });
      }
    }

    // Insurance info
    let insuranceInfo;
    if (pd.ins) {
      const prov = pick(INS_PROVIDERS);
      insuranceInfo = {
        provider:       prov,
        policyNumber:   `POL${rand(10000000, 99999999)}`,
        validUntil:     daysAhead(rand(30, 700)),
        coverageAmount: pick([100000, 200000, 300000, 500000, 1000000]),
      };
    }

    const profile = await Patient.create({
      userId:           u._id,
      patientId:        `PAT2026${String(i + 1).padStart(3, '0')}`,
      bloodGroup:       pd.bg,
      emergencyContact: {
        name:     `${pd.name.split(' ')[0]}'s Contact`,
        phone:    `9${rand(700000000, 999999999)}`,
        relation: pick(['Spouse', 'Parent', 'Sibling', 'Child', 'Friend']),
      },
      medicalHistory:    medHistory,
      allergies:         chance(0.35) ? [pick(ALLERGIES)] : [],
      labReports,
      ...(insuranceInfo ? { insuranceInfo } : {}),
    });
    patientProfiles.push(profile);
  }
  console.log(`   ✓ ${patientProfiles.length} patients created with history, insurance & lab data\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. MEDICINES (31)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('💊  Creating medicines …');
  const medicines = [];
  for (const m of MEDICINES_RAW) {
    const expiryDate = m.ahead >= 0 ? daysAhead(m.ahead) : daysAgo(-m.ahead);
    const med = await Medicine.create({
      name: m.name, genericName: m.gen, manufacturer: m.mfg,
      category: m.cat, dosageForm: m.form, strength: m.str,
      unitPrice: m.price, stockQuantity: m.stock, reorderLevel: m.reorder,
      expiryDate,
      batchNumber:          `BN${rand(100000, 999999)}`,
      supplier:             { name: 'MediSupply India Pvt Ltd', contact: '1800-000-MEDS', email: 'orders@medisupply.in' },
      prescriptionRequired: !['Analgesic', 'Gastrointestinal', 'Antihistamine'].includes(m.cat),
      isActive:             true,
      lastRestocked:        daysAgo(rand(5, 90)),
    });
    medicines.push(med);
  }
  console.log(`   ✓ ${medicines.length} medicines (includes near-expiry and out-of-stock scenarios)\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. APPOINTMENTS
  //    Past:   10 per doctor   =  130 completed (spread Jan–May 14)
  //    Future: 15 per doctor   =  195 scheduled (spread May 16–Nov 15)
  //    Total:  ~325 appointments
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📅  Generating appointments …');

  const pastAppts    = [];
  const futureAppts  = [];

  // ── Past appointments ──────────────────────────────────────────────────
  // 3 per doctor in last 30 days (recent activity), 7 spread Jan–Apr
  for (let di = 0; di < doctorProfiles.length; di++) {
    const doc = doctorProfiles[di];

    // 3 recent (last 30 days)
    for (let k = 0; k < 3; k++) {
      const ptIdx = (di * 3 + k * 7 + 5) % patientProfiles.length;
      const diagIdx = (di + k) % DIAGS.length;
      const aDate = pastDate(1, 30);
      const status = chance(0.75) ? 'Completed' : (chance(0.5) ? 'No-Show' : 'Cancelled');
      const appt = await Appointment.create({
        patient:         patientProfiles[ptIdx]._id,
        doctor:          doc._id,
        appointmentDate: aDate,
        timeSlot:        pickSlot(),
        type:            pick(['Consultation', 'Consultation', 'Follow-up']),
        status,
        priority:        chance(0.15) ? 'Urgent' : 'Normal',
        symptoms:        SYMPTOMS[diagIdx % SYMPTOMS.length],
        diagnosis:       status === 'Completed' ? DIAGS[diagIdx] : undefined,
        consultationFee: doc.consultationFee,
        notes:           status === 'Completed' ? 'Patient reviewed. Prescription issued.' : undefined,
        cancelReason:    status === 'Cancelled' ? pick(['Patient request', 'Doctor unavailable', 'Emergency']) : undefined,
      });
      pastAppts.push({ appt, doc, patient: patientProfiles[ptIdx], ptUser: patientUsers[ptIdx] });
    }

    // 7 spread Jan 1 – Apr 30 (historical depth for charts)
    for (let k = 0; k < 7; k++) {
      const ptIdx   = (di * 7 + k * 13 + 11) % patientProfiles.length;
      const diagIdx = (di + k + 3) % DIAGS.length;
      const daysBack = rand(15, 135);
      const aDate   = skipSundayBack(daysAgo(daysBack));
      const status  = chance(0.72) ? 'Completed' : (chance(0.5) ? 'No-Show' : 'Cancelled');
      const appt = await Appointment.create({
        patient:         patientProfiles[ptIdx]._id,
        doctor:          doc._id,
        appointmentDate: aDate,
        timeSlot:        pickSlot(),
        type:            pick(['Consultation', 'Consultation', 'Consultation', 'Follow-up', 'Emergency']),
        status,
        priority:        chance(0.12) ? 'Urgent' : 'Normal',
        symptoms:        SYMPTOMS[diagIdx % SYMPTOMS.length],
        diagnosis:       status === 'Completed' ? DIAGS[diagIdx] : undefined,
        consultationFee: doc.consultationFee,
        notes:           status === 'Completed' ? 'Follow up advised in 4 weeks.' : undefined,
        cancelReason:    status === 'Cancelled' ? pick(['Patient request', 'Doctor on leave', 'Rescheduled']) : undefined,
      });
      pastAppts.push({ appt, doc, patient: patientProfiles[ptIdx], ptUser: patientUsers[ptIdx] });
    }
  }

  // ── Future appointments — 15 per doctor spread across 6 months ────────
  // Weighted: more in near-future (first 2 months), fewer in later months
  for (let di = 0; di < doctorProfiles.length; di++) {
    const doc = doctorProfiles[di];
    const futureCounts = [
      { minD: 1,   maxD: 21,  n: 4 },  // next 3 weeks — dense
      { minD: 22,  maxD: 60,  n: 4 },  // 1-2 months ahead
      { minD: 61,  maxD: 91,  n: 3 },  // 2-3 months ahead
      { minD: 92,  maxD: 122, n: 2 },  // 3-4 months ahead
      { minD: 123, maxD: 153, n: 1 },  // 4-5 months ahead
      { minD: 154, maxD: 184, n: 1 },  // 5-6 months ahead
    ];
    let futureIdx = 0;
    for (const window of futureCounts) {
      for (let k = 0; k < window.n; k++) {
        const ptIdx = (di * 15 + futureIdx * 3 + 7) % patientProfiles.length;
        const aDate = skipSunday(daysAhead(rand(window.minD, window.maxD)));
        const appt  = await Appointment.create({
          patient:         patientProfiles[ptIdx]._id,
          doctor:          doc._id,
          appointmentDate: aDate,
          timeSlot:        pickSlot(),
          type:            pick(['Consultation', 'Follow-up', 'Follow-up', 'Consultation']),
          status:          aDate <= daysAhead(14) ? pick(['Confirmed', 'Confirmed', 'Scheduled']) : 'Scheduled',
          priority:        chance(0.1) ? 'Urgent' : 'Normal',
          symptoms:        pick(SYMPTOMS),
          consultationFee: doc.consultationFee,
          notes:           'Appointment pre-booked by patient.',
        });
        futureAppts.push({ appt, doc, patient: patientProfiles[ptIdx] });
        futureIdx++;
      }
    }
  }

  const completedPastAppts = pastAppts.filter(a => a.appt.status === 'Completed');
  console.log(`   ✓ ${pastAppts.length} past appointments  (${completedPastAppts.length} Completed, ${pastAppts.length - completedPastAppts.length} Cancelled/No-Show)`);
  console.log(`   ✓ ${futureAppts.length} future appointments (May 16 – Nov 15, 2026)\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. PRESCRIPTIONS (for Completed past appointments, ~80%)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('📄  Creating prescriptions …');

  const DOSAGE_OPTS    = ['1 tablet', '2 tablets', '½ tablet', '5 ml', '10 ml', '1 capsule'];
  const FREQ_OPTS      = ['Once daily', 'Twice daily', 'Three times daily', 'At bedtime', 'Every 8 hours', 'Every 12 hours'];
  const DURATION_OPTS  = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '3 months', '6 months'];
  const INSTRUCT_OPTS  = ['Take after meals', 'Take before meals', 'Take with water', 'Take at bedtime', 'Take with food', 'Avoid dairy'];

  const rxList = [];

  for (const { appt, doc, patient, ptUser } of completedPastAppts) {
    if (!chance(0.82)) continue; // 82% of completed appointments get a prescription

    const numMeds = rand(2, 4);
    const shuffledMeds = [...medicines].sort(() => Math.random() - 0.5).slice(0, numMeds);
    const rxStatus  = pick(['Fulfilled', 'Fulfilled', 'Fulfilled', 'Partially-Filled', 'Pending']);

    const medEntries = shuffledMeds.map(m => ({
      medicine:          m._id,
      dosage:            pick(DOSAGE_OPTS),
      frequency:         pick(FREQ_OPTS),
      duration:          pick(DURATION_OPTS),
      instructions:      pick(INSTRUCT_OPTS),
      quantity:          rand(10, 60),
      dispensedQuantity: rxStatus === 'Fulfilled' ? rand(10, 60) : (rxStatus === 'Partially-Filled' ? rand(1, 9) : 0),
      ...(rxStatus !== 'Pending' ? { dispensedBy: pharmacistUser._id, dispensedAt: new Date(appt.appointmentDate.getTime() + 1000 * 60 * 60) } : {}),
    }));

    const rx = await Prescription.create({
      patient:       patient._id,
      doctor:        doc._id,
      appointment:   appt._id,
      medicines:     medEntries,
      diagnosis:     appt.diagnosis,
      symptoms:      appt.symptoms,
      labTests:      chance(0.45) ? [pick(LAB_TESTS), ...(chance(0.3) ? [pick(LAB_TESTS)] : [])] : [],
      status:        rxStatus,
      refillsAllowed: pick([0, 0, 1, 2]),
      refillsUsed:   0,
      validUntil:    daysAhead(rand(30, 90)),
      notes:         'Follow up if symptoms persist or worsen beyond 7 days.',
    });

    await Appointment.findByIdAndUpdate(appt._id, { prescription: rx._id });
    rxList.push({ rx, doc, patient, ptUser, meds: shuffledMeds, apptDate: appt.appointmentDate });
  }
  console.log(`   ✓ ${rxList.length} prescriptions created (Fulfilled / Partially-Filled / Pending)\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 8. BILLING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('💳  Creating bills …');
  let totalBills = 0;

  // ── A. Consultation bills — every Completed appointment ──────────────────
  for (const { appt, doc, patient, ptUser } of completedPastAppts) {
    const fee  = appt.consultationFee || 500;
    const paid = chance(0.72); // 72% paid
    const partlyPaid = !paid && chance(0.3);
    const amtPaid = paid ? fee : (partlyPaid ? Math.floor(fee * rand(3, 7) / 10) : 0);
    const status  = paid ? 'Paid' : (partlyPaid ? 'Partially-Paid' : 'Unpaid');

    // Insurance claim for patients who have insurance
    const ptProfile = patient;
    const hasIns    = ptProfile.insuranceInfo?.provider;
    let insuranceClaim;
    if (hasIns && fee > 500 && chance(0.3)) {
      const claimAmt    = Math.floor(fee * 0.6);
      const claimStatus = pick(['Approved', 'Pending', 'Partially-Approved']);
      insuranceClaim = {
        claimNumber:   `CLM${rand(100000, 999999)}`,
        provider:      ptProfile.insuranceInfo.provider,
        amountClaimed: claimAmt,
        approvedAmount: claimStatus === 'Approved' ? claimAmt : (claimStatus === 'Partially-Approved' ? Math.floor(claimAmt * 0.6) : 0),
        status:         claimStatus,
        submittedDate:  new Date(appt.appointmentDate.getTime() + 1000 * 60 * 60 * 2),
        processedDate:  claimStatus !== 'Pending' ? new Date(appt.appointmentDate.getTime() + 1000 * 60 * 60 * 24 * 3) : undefined,
      };
    }

    const bill = new Billing({
      patient:              patient._id,
      billType:             'Consultation',
      billDate:             appt.appointmentDate,
      items: [{ description: `${doc.specialization} Consultation`, category: 'Consultation', quantity: 1, unitPrice: fee, amount: fee }],
      subtotal: fee, discount: 0, tax: 0, totalAmount: fee,
      amountPaid: amtPaid, balance: fee - amtPaid, paymentStatus: status,
      paymentMethod: paid ? pick(['Cash', 'Card', 'UPI', 'Net Banking']) : undefined,
      payments: paid
        ? [{ amount: fee, paymentMethod: pick(['Cash', 'UPI']), paymentDate: appt.appointmentDate }]
        : (partlyPaid ? [{ amount: amtPaid, paymentMethod: 'Cash', paymentDate: appt.appointmentDate }] : []),
      ...(insuranceClaim ? { insuranceClaim } : {}),
      createdByRole: 'Receptionist', generatedBy: adminUser._id,
      relatedAppointmentId: appt._id,
    });
    bill.billNumber = billNum(appt.appointmentDate);
    await bill.save();
    totalBills++;
  }

  // ── B. Pharmacy bills — for Fulfilled / Partially-Filled prescriptions ───
  for (const { rx, patient, meds, apptDate } of rxList) {
    if (rx.status === 'Pending') continue;
    const items = meds.map(m => {
      const qty = rand(1, 3);
      return { description: m.name, category: 'Medicine', quantity: qty, unitPrice: m.unitPrice, amount: m.unitPrice * qty };
    });
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const discount = chance(0.25) ? rand(20, Math.max(20, Math.floor(subtotal * 0.08))) : 0;
    const total    = subtotal - discount;
    const paid     = chance(0.78);
    const amtPaid  = paid ? total : 0;

    const billDate = new Date(apptDate.getTime() + 1000 * 60 * rand(30, 120));
    const bill     = new Billing({
      patient:         patient._id,
      billType:        'Pharmacy',
      billDate,
      items, subtotal, discount, tax: 0, totalAmount: total,
      amountPaid: amtPaid, balance: total - amtPaid,
      paymentStatus:   paid ? 'Paid' : 'Unpaid',
      paymentMethod:   paid ? pick(['Cash', 'UPI', 'Card']) : undefined,
      payments:        paid ? [{ amount: total, paymentMethod: pick(['Cash', 'UPI']), paymentDate: billDate }] : [],
      createdByRole:   'Pharmacist', generatedBy: pharmacistUser._id,
    });
    bill.billNumber = billNum(billDate);
    await bill.save();
    totalBills++;
  }

  // ── C. Lab / Test bills (for 1 in every 3 patients) ─────────────────────
  const TESTS = [
    { name: 'Complete Blood Count (CBC)',   price: 350  },
    { name: 'Liver Function Test (LFT)',    price: 550  },
    { name: 'Renal Function Test (RFT)',    price: 500  },
    { name: 'Blood Sugar (Fasting)',        price: 120  },
    { name: 'Lipid Profile',               price: 700  },
    { name: 'Thyroid Function (TSH)',       price: 400  },
    { name: 'Urine Routine Microscopy',    price: 150  },
    { name: 'HbA1c',                       price: 450  },
    { name: 'ECG 12-Lead',                 price: 200  },
    { name: 'X-Ray Chest PA',              price: 500  },
    { name: 'Ultrasound Abdomen',          price: 1200 },
    { name: '2D Echocardiogram',           price: 2500 },
    { name: 'MRI Brain with Contrast',     price: 8000 },
    { name: 'CT Scan Abdomen & Pelvis',    price: 5500 },
    { name: 'FNAC / Biopsy',               price: 1800 },
  ];
  for (let i = 0; i < patientProfiles.length; i += 3) {
    const numTests  = rand(1, 3);
    const testItems = [];
    const shuffled  = [...TESTS].sort(() => Math.random() - 0.5).slice(0, numTests);
    for (const t of shuffled) {
      testItems.push({ description: t.name, category: 'Lab Test', quantity: 1, unitPrice: t.price, amount: t.price });
    }
    const subtotal = testItems.reduce((s, t) => s + t.amount, 0);
    const paid     = chance(0.65);
    const billDate = pastDate(1, 90);
    const bill     = new Billing({
      patient:         patientProfiles[i]._id,
      billType:        'Test',
      billDate,
      items:           testItems,
      subtotal, discount: 0, tax: 0, totalAmount: subtotal,
      amountPaid:      paid ? subtotal : 0,
      balance:         paid ? 0 : subtotal,
      paymentStatus:   paid ? 'Paid' : 'Unpaid',
      paymentMethod:   paid ? pick(['Cash', 'Card', 'UPI', 'Net Banking']) : undefined,
      payments:        paid ? [{ amount: subtotal, paymentMethod: pick(['Cash', 'Card']), paymentDate: billDate }] : [],
      createdByRole:   'Receptionist', generatedBy: adminUser._id,
    });
    bill.billNumber = billNum(billDate);
    await bill.save();
    totalBills++;
  }

  // ── D. Partially-paid and insurance consultation bills ───────────────────
  for (let i = 0; i < 8; i++) {
    const docIdx = rand(0, doctorProfiles.length - 1);
    const ptIdx  = rand(0, patientProfiles.length - 1);
    const fee    = doctorProfiles[docIdx].consultationFee;
    const amtPd  = Math.floor(fee * (rand(3, 7) / 10));
    const billDate = pastDate(2, 45);
    const bill   = new Billing({
      patient:         patientProfiles[ptIdx]._id,
      billType:        'Consultation',
      billDate,
      items: [{ description: 'Specialist Consultation', category: 'Consultation', quantity: 1, unitPrice: fee, amount: fee }],
      subtotal: fee, discount: 0, tax: 0, totalAmount: fee,
      amountPaid: amtPd, balance: fee - amtPd, paymentStatus: 'Partially-Paid',
      paymentMethod: 'Cash',
      payments: [{ amount: amtPd, paymentMethod: 'Cash', paymentDate: billDate }],
      createdByRole: 'Receptionist', generatedBy: adminUser._id,
    });
    bill.billNumber = billNum(billDate);
    await bill.save();
    totalBills++;
  }

  console.log(`   ✓ ${totalBills} bills created (Consultation + Pharmacy + Lab + Partial-Pay)\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // 9. WARDS (6 wards — realistic bed occupancy + discharge bills)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('🏥  Creating wards …');
  const assignedPtIds = new Set();

  const occupyBed = (bedNum, ptProfile, daysAdmitted = 3) => {
    if (!ptProfile || assignedPtIds.has(ptProfile._id.toString())) {
      return { bedNumber: bedNum, isOccupied: false };
    }
    assignedPtIds.add(ptProfile._id.toString());
    return {
      bedNumber:            bedNum,
      isOccupied:           true,
      patient:              ptProfile._id,
      admissionDate:        daysAgo(daysAdmitted),
      expectedDischargeDate: daysAhead(rand(1, 6)),
    };
  };
  const emptyBed = bn => ({ bedNumber: bn, isOccupied: false });

  // General Ward — 12 beds, 6 occupied
  const genBeds = [
    occupyBed('G-01', patientProfiles[4],  6),
    occupyBed('G-02', patientProfiles[7],  4),
    occupyBed('G-03', patientProfiles[10], 8),
    occupyBed('G-04', patientProfiles[13], 2),
    occupyBed('G-05', patientProfiles[16], 5),
    occupyBed('G-06', patientProfiles[19], 3),
    emptyBed('G-07'), emptyBed('G-08'), emptyBed('G-09'),
    emptyBed('G-10'), emptyBed('G-11'), emptyBed('G-12'),
  ];
  await Ward.create({
    wardNumber: 'W-001', wardName: 'General Ward A', wardType: 'General',
    department: 'General Medicine', floor: 2, totalBeds: 12, availableBeds: 6,
    beds: genBeds, gender: 'Mixed', dailyRate: 800,
    facilities: ['Nursing Station', 'TV', 'WiFi', 'Attached Washroom', 'AC'],
    isActive: true,
  });

  // ICU — 6 beds, 3 occupied
  const icuBeds = [
    occupyBed('ICU-01', patientProfiles[2],  1),
    occupyBed('ICU-02', patientProfiles[5],  2),
    occupyBed('ICU-03', patientProfiles[20], 1),
    emptyBed('ICU-04'), emptyBed('ICU-05'), emptyBed('ICU-06'),
  ];
  await Ward.create({
    wardNumber: 'W-002', wardName: 'Intensive Care Unit', wardType: 'ICU',
    department: 'Critical Care', floor: 3, totalBeds: 6, availableBeds: 3,
    beds: icuBeds, gender: 'Mixed', dailyRate: 5500,
    facilities: ['Ventilator', 'Cardiac Monitor', '24h Specialist', 'Central Nursing', 'Defibrillator'],
    isActive: true,
  });

  // Private Ward — 8 beds, 4 occupied
  const pvtBeds = [
    occupyBed('PV-01', patientProfiles[1],  3),
    occupyBed('PV-02', patientProfiles[8],  4),
    occupyBed('PV-03', patientProfiles[24], 2),
    occupyBed('PV-04', patientProfiles[31], 1),
    emptyBed('PV-05'), emptyBed('PV-06'), emptyBed('PV-07'), emptyBed('PV-08'),
  ];
  await Ward.create({
    wardNumber: 'W-003', wardName: 'Private Wing', wardType: 'Private',
    department: 'General Medicine', floor: 4, totalBeds: 8, availableBeds: 4,
    beds: pvtBeds, gender: 'Mixed', dailyRate: 2500,
    facilities: ['Private Bathroom', 'AC', 'TV', 'WiFi', 'Sofa Bed for Attendant', 'Mini Fridge'],
    isActive: true,
  });

  // Paediatric Ward — 6 beds, 2 occupied
  const pedBeds = [
    occupyBed('PED-01', patientProfiles[3],  5),
    occupyBed('PED-02', patientProfiles[21], 3),
    emptyBed('PED-03'), emptyBed('PED-04'), emptyBed('PED-05'), emptyBed('PED-06'),
  ];
  await Ward.create({
    wardNumber: 'W-004', wardName: 'Paediatric Ward', wardType: 'General',
    department: 'Pediatrics', floor: 2, totalBeds: 6, availableBeds: 4,
    beds: pedBeds, gender: 'Mixed', dailyRate: 1200,
    facilities: ['Crib Beds', 'Play Area', 'Paediatric Nurses', '24h Monitoring'],
    isActive: true,
  });

  // Emergency — 4 beds, 2 occupied
  const emBeds = [
    occupyBed('EM-01', patientProfiles[28], 1),
    occupyBed('EM-02', patientProfiles[33], 1),
    emptyBed('EM-03'), emptyBed('EM-04'),
  ];
  await Ward.create({
    wardNumber: 'W-005', wardName: 'Emergency Ward', wardType: 'Emergency',
    department: 'Emergency Medicine', floor: 1, totalBeds: 4, availableBeds: 2,
    beds: emBeds, gender: 'Mixed', dailyRate: 3000,
    facilities: ['Emergency Equipment', 'Triage Station', 'Resuscitation Bay', '24h Staffing'],
    isActive: true,
  });

  // Semi-Private Ward — 6 beds, 3 occupied
  const spBeds = [
    occupyBed('SP-01', patientProfiles[12], 4),
    occupyBed('SP-02', patientProfiles[26], 2),
    occupyBed('SP-03', patientProfiles[39], 3),
    emptyBed('SP-04'), emptyBed('SP-05'), emptyBed('SP-06'),
  ];
  await Ward.create({
    wardNumber: 'W-006', wardName: 'Semi-Private Ward', wardType: 'Semi-Private',
    department: 'General Medicine', floor: 3, totalBeds: 6, availableBeds: 3,
    beds: spBeds, gender: 'Mixed', dailyRate: 1600,
    facilities: ['Shared Bathroom', 'AC', 'TV', 'WiFi'],
    isActive: true,
  });

  console.log('   ✓ 6 wards created (42 total beds, 20 currently occupied)\n');

  // ── Ward discharge bills (for 10 recently discharged patients) ───────────
  console.log('   Generating ward discharge bills for recently discharged patients …');
  const WARD_CONFIGS = [
    { name: 'General Ward A',   rate: 800  },
    { name: 'ICU',              rate: 5500 },
    { name: 'Private Wing',     rate: 2500 },
    { name: 'Paediatric Ward',  rate: 1200 },
    { name: 'Emergency Ward',   rate: 3000 },
    { name: 'Semi-Private Ward',rate: 1600 },
  ];
  for (let i = 0; i < 12; i++) {
    const ptIdx    = (i * 4 + 2) % patientProfiles.length;
    const ward     = pick(WARD_CONFIGS);
    const days     = rand(2, 10);
    const admDate  = daysAgo(days + rand(0, 5));
    const discDate = new Date(admDate.getTime() + 1000 * 60 * 60 * 24 * days);
    const wardAmt  = ward.rate * days;
    const paid     = chance(0.7);
    const bill     = new Billing({
      patient:        patientProfiles[ptIdx]._id,
      billType:       'Ward',
      billDate:       discDate,
      items: [{
        description: `Ward Stay — ${ward.name} (${days} day${days > 1 ? 's' : ''})`,
        category:    'Room Charges',
        quantity:    days,
        unitPrice:   ward.rate,
        amount:      wardAmt,
      }],
      subtotal: wardAmt, discount: 0, tax: 0, totalAmount: wardAmt,
      amountPaid: paid ? wardAmt : 0, balance: paid ? 0 : wardAmt,
      paymentStatus: paid ? 'Paid' : 'Unpaid',
      paymentMethod: paid ? pick(['Cash', 'Card', 'Net Banking', 'Insurance']) : undefined,
      payments: paid ? [{ amount: wardAmt, paymentMethod: pick(['Cash', 'Card']), paymentDate: discDate }] : [],
      createdByRole: 'Receptionist', generatedBy: adminUser._id,
    });
    bill.billNumber = billNum(discDate);
    await bill.save();
    totalBills++;
  }
  console.log(`   ✓ 12 ward discharge bills created\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ─────────────────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    User.countDocuments(), Doctor.countDocuments(), Staff.countDocuments(),
    Patient.countDocuments(), Appointment.countDocuments(), Prescription.countDocuments(),
    Medicine.countDocuments(), Billing.countDocuments(), Ward.countDocuments(),
  ]);

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║              🎉  Seeding Complete — Summary               ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Users          ${String(counts[0]).padStart(4)}   (Admin + Doctors + Staff + Patients) ║`);
  console.log(`║  Doctors        ${String(counts[1]).padStart(4)}                                        ║`);
  console.log(`║  Staff          ${String(counts[2]).padStart(4)}   (Nurses, Pharmacists, Lab, etc.)     ║`);
  console.log(`║  Patients       ${String(counts[3]).padStart(4)}   (with history, insurance, lab data)  ║`);
  console.log(`║  Appointments   ${String(counts[4]).padStart(4)}   (${pastAppts.length} past + ${futureAppts.length} future — 6 months)      ║`);
  console.log(`║  Prescriptions  ${String(counts[5]).padStart(4)}                                        ║`);
  console.log(`║  Medicines      ${String(counts[6]).padStart(4)}   (includes near-expiry + expired)     ║`);
  console.log(`║  Bills          ${String(counts[7]).padStart(4)}   (Consultation/Pharmacy/Lab/Ward)     ║`);
  console.log(`║  Wards          ${String(counts[8]).padStart(4)}   (6 wards, 42 beds, 20 occupied)      ║`);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Demo Login Credentials                                   ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Admin        → admin@medilink.com         / admin123     ║');
  console.log('║  Doctor       → doctor@medilink.com        / doctor123    ║');
  console.log('║  Patient      → patient@medilink.com       / patient123   ║');
  console.log('║  Receptionist → receptionist@medilink.com  / staff123     ║');
  console.log('║  Nurse        → nurse@medilink.com         / staff123     ║');
  console.log('║  Pharmacist   → pharmacist@medilink.com    / staff123     ║');
  console.log('║  Lab Tech     → lab@medilink.com           / staff123     ║');
  console.log('║  Ward Manager → ward@medilink.com          / staff123     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message || err);
  process.exit(1);
});

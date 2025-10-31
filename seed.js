const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const uri = "mongodb://127.0.0.1:27017/hospitalDB";

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String,
});

const doctorSchema = new mongoose.Schema({
  name: String,
  specialization: String,
  qualification: String,
  availability: [String],
  consultationFee: Number,
});

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  bloodGroup: String,
  allergies: [String],
  medicalHistory: [String],
  iotDeviceId: String,
});

const appointmentSchema = new mongoose.Schema({
  doctorId: mongoose.Schema.Types.ObjectId,
  patientId: mongoose.Schema.Types.ObjectId,
  date: Date,
  status: String,
  aiPredictedDuration: Number,
  priority: String,
});

const inventorySchema = new mongoose.Schema({
  name: String,
  type: String,
  stock: Number,
  expiryDate: Date,
});

const wardSchema = new mongoose.Schema({
  name: String,
  type: String,
  capacity: Number,
  occupiedBeds: Number,
});

const prescriptionSchema = new mongoose.Schema({
  patientId: mongoose.Schema.Types.ObjectId,
  doctorId: mongoose.Schema.Types.ObjectId,
  medicines: [String],
  warnings: String,
});

const iotReadingSchema = new mongoose.Schema({
  patientId: mongoose.Schema.Types.ObjectId,
  heartRate: Number,
  bp: String,
  temperature: Number,
  oxygen: Number,
  timestamp: Date,
});

const auditLogSchema = new mongoose.Schema({
  userEmail: String,
  action: String,
  timestamp: Date,
});

const User = mongoose.model("User", userSchema);
const Doctor = mongoose.model("Doctor", doctorSchema);
const Patient = mongoose.model("Patient", patientSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);
const Inventory = mongoose.model("Inventory", inventorySchema);
const Ward = mongoose.model("Ward", wardSchema);
const Prescription = mongoose.model("Prescription", prescriptionSchema);
const IoTReading = mongoose.model("IoTReading", iotReadingSchema);
const AuditLog = mongoose.model("AuditLog", auditLogSchema);

const seedData = async () => {
  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  await mongoose.connection.db.dropDatabase();

  // Admin user
  const hashedPassword = await bcrypt.hash("Admin@123", 12);
  const adminUser = await User.create({
    email: "admin@hospital.com",
    password: hashedPassword,
    role: "admin",
  });

  // Doctors
  const doctors = await Doctor.insertMany([
    { name: "Dr. Meera Nair", specialization: "Cardiology", qualification: "MD", availability: ["Mon", "Wed", "Fri"], consultationFee: 1500 },
    { name: "Dr. Rohan Patel", specialization: "Neurology", qualification: "DM", availability: ["Tue", "Thu"], consultationFee: 2000 },
    { name: "Dr. Kavita Shah", specialization: "Pediatrics", qualification: "DCH", availability: ["Mon", "Tue", "Sat"], consultationFee: 1000 },
  ]);

  // Patients
  const patients = await Patient.insertMany([
    { name: "Aarav Sharma", age: 30, gender: "Male", bloodGroup: "O+", allergies: ["Penicillin"], medicalHistory: ["Asthma"], iotDeviceId: "IOT1001" },
    { name: "Neha Gupta", age: 45, gender: "Female", bloodGroup: "A+", allergies: [], medicalHistory: ["Diabetes"], iotDeviceId: "IOT1002" },
    { name: "Riya Verma", age: 10, gender: "Female", bloodGroup: "B+", allergies: ["Dust"], medicalHistory: ["Flu"], iotDeviceId: "IOT1003" },
    { name: "Vikram Rao", age: 60, gender: "Male", bloodGroup: "AB+", allergies: ["Latex"], medicalHistory: ["Hypertension"], iotDeviceId: "IOT1004" },
    { name: "Sanya Iyer", age: 25, gender: "Female", bloodGroup: "O-", allergies: [], medicalHistory: ["Migraine"], iotDeviceId: "IOT1005" },
  ]);

  // Appointments
  const appointments = [];
  for (let i = 0; i < 10; i++) {
    appointments.push({
      doctorId: doctors[i % 3]._id,
      patientId: patients[i % 5]._id,
      date: new Date(2025, 9, i + 1),
      status: ["Scheduled", "Completed", "Cancelled"][i % 3],
      aiPredictedDuration: 15 + i * 2,
      priority: ["Low", "Medium", "High"][i % 3],
    });
  }
  await Appointment.insertMany(appointments);

  // Inventory
  const inventory = [];
  for (let i = 1; i <= 20; i++) {
    inventory.push({
      name: `Item ${i}`,
      type: i % 2 === 0 ? "Medicine" : "Equipment",
      stock: 20 + i,
      expiryDate: new Date(2026, i % 12, 15),
    });
  }
  await Inventory.insertMany(inventory);

  // Wards
  await Ward.insertMany([
    { name: "General Ward", type: "General", capacity: 30, occupiedBeds: 10 },
    { name: "Private Ward", type: "Private", capacity: 10, occupiedBeds: 3 },
    { name: "ICU", type: "Critical", capacity: 5, occupiedBeds: 4 },
    { name: "Pediatric Ward", type: "Child Care", capacity: 8, occupiedBeds: 5 },
    { name: "Maternity Ward", type: "Maternity", capacity: 6, occupiedBeds: 2 },
  ]);

  // Prescriptions
  await Prescription.insertMany([
    { patientId: patients[0]._id, doctorId: doctors[0]._id, medicines: ["Aspirin"], warnings: "Check for stomach upset" },
    { patientId: patients[1]._id, doctorId: doctors[1]._id, medicines: ["Metformin"], warnings: "Monitor blood sugar" },
    { patientId: patients[2]._id, doctorId: doctors[2]._id, medicines: ["Paracetamol"], warnings: "Avoid overdose" },
    { patientId: patients[3]._id, doctorId: doctors[0]._id, medicines: ["Atenolol"], warnings: "Monitor BP" },
    { patientId: patients[4]._id, doctorId: doctors[1]._id, medicines: ["Ibuprofen"], warnings: "Avoid with gastritis" },
  ]);

  // IoT Readings
  await IoTReading.insertMany([
    { patientId: patients[0]._id, heartRate: 75, bp: "120/80", temperature: 98.6, oxygen: 98, timestamp: new Date() },
    { patientId: patients[1]._id, heartRate: 88, bp: "130/85", temperature: 99.1, oxygen: 97, timestamp: new Date() },
  ]);

  console.log("🌱 Database seeded successfully!");
  mongoose.connection.close();
};

seedData();

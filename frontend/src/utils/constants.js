export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || ''

export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PATIENT: 'patient',
  RECEPTIONIST: 'receptionist',
  PHARMACIST: 'pharmacist'
}

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

export const PAYMENT_STATUS = {
  PAID: 'paid',
  UNPAID: 'unpaid',
  PARTIAL: 'partial'
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export const DEPARTMENTS = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Gynecology',
  'ENT',
  'General Surgery',
  'Ophthalmology',
  'Psychiatry'
]

export const MEDICINE_CATEGORIES = [
  'Analgesic',
  'Antibiotic',
  'Anti-inflammatory',
  'Antidiabetic',
  'Antihypertensive',
  'Antihistamine',
  'Antacid',
  'Vitamin'
]
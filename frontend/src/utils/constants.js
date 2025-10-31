export const USER_ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    STAFF: 'staff',
    PATIENT: 'patient',
  };
  
  export const APPOINTMENT_STATUS = {
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no-show',
  };
  
  export const APPOINTMENT_TYPES = {
    CONSULTATION: 'consultation',
    FOLLOW_UP: 'follow-up',
    SURGERY: 'surgery',
    EMERGENCY: 'emergency',
  };
  
  export const WARD_TYPES = {
    GENERAL: 'general',
    PRIVATE: 'private',
    ICU: 'ICU',
    PEDIATRIC: 'pediatric',
    MATERNITY: 'maternity',
    ISOLATION: 'isolation',
  };
  
  export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  
  export const SPECIALIZATIONS = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Psychiatry',
    'General Medicine',
    'Surgery',
  ];
  
  export const INVENTORY_CATEGORIES = {
    MEDICINE: 'medicine',
    EQUIPMENT: 'equipment',
    SUPPLIES: 'supplies',
    SURGICAL: 'surgical',
  };
  
  export const INVENTORY_STATUS = {
    AVAILABLE: 'available',
    LOW_STOCK: 'low-stock',
    OUT_OF_STOCK: 'out-of-stock',
    EXPIRED: 'expired',
  };
  
  export const IOT_READING_TYPES = {
    HEART_RATE: 'heartRate',
    BLOOD_PRESSURE: 'bloodPressure',
    TEMPERATURE: 'temperature',
    OXYGEN_LEVEL: 'oxygenLevel',
    RESPIRATORY_RATE: 'respiratoryRate',
  };
  
  export const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  
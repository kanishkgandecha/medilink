'use strict';

// Single source of truth for the MediLink HTTP API contract.
// Every entry corresponds to exactly one Express route (verified by
// tests/openapiContract.test.js against the live router). `build.js` turns this
// catalog into the OpenAPI 3.1 document at openapi/openapi.json.
//
// Role keys: admin, doctor, patient, nurse, receptionist, pharmacist,
// lab-technician, radiology-technician, billing-staff, ward-manager.
// `owner`: who passes record-level checks by owning the record
// ('patient' = owning patient, 'doctor' = assigned/own doctor).
// `careScope`: doctor needs a care relationship (shared non-cancelled
// appointment or a prescription); nurse needs an active encounter.

const s = {
  str: (extra = {}) => ({ type: 'string', ...extra }),
  id: () => ({ type: 'string', description: 'Record UUID (legacy 24-hex Mongo IDs are also accepted)' }),
  int: (extra = {}) => ({ type: 'integer', ...extra }),
  num: (extra = {}) => ({ type: 'number', ...extra }),
  bool: () => ({ type: 'boolean' }),
  date: () => ({ type: 'string', format: 'date' }),
  dateTime: () => ({ type: 'string', format: 'date-time' }),
  time: () => ({ type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' }),
  uuid: () => ({ type: 'string', format: 'uuid' }),
  enum: (values) => ({ type: 'string', enum: values }),
  arr: (items, extra = {}) => ({ type: 'array', items, ...extra }),
  obj: (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: true }),
  ref: (name) => ({ $ref: `#/components/schemas/${name}` }),
  any: () => ({}),
};

const ROLES = {
  admin: 'admin', doctor: 'doctor', patient: 'patient', nurse: 'nurse', receptionist: 'receptionist',
  pharmacist: 'pharmacist', lab: 'lab-technician', radiology: 'radiology-technician', billing: 'billing-staff', ward: 'ward-manager',
};
const ALL_ROLES = Object.values(ROLES);
const ANY = 'any-authenticated';
const R = ROLES;

const GENDER = ['Male', 'Female', 'Other'];
const BLOOD_GROUPS = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE',
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']; // labels are accepted and normalized to enum names
const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Net Banking', 'Insurance', 'Online', 'Other', 'Cheque'];
const APPOINTMENT_STATUS = ['Scheduled', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'No-Show'];
const LAB_STATUS = ['Pending', 'Collected', 'Processing', 'Completed', 'Verified', 'Amended', 'Cancelled'];
const MEDICINE_CATEGORY = ['Analgesic', 'Antibiotic', 'Anti_inflammatory', 'Antidiabetic', 'Antihypertensive', 'Antihistamine',
  'Cardiovascular', 'Gastrointestinal', 'Respiratory', 'Neurological', 'Dermatological', 'Other'];
const DOSAGE_FORM = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Other'];
const WARD_TYPE = ['General', 'ICU', 'NICU', 'Private', 'Semi_Private', 'Emergency', 'Isolation'];
const WARD_GENDER = ['Male', 'Female', 'Mixed'];
const BILLING_CATEGORY = ['Consultation', 'Medicine', 'Lab_Test', 'Imaging', 'Surgery', 'Room_Charges', 'Emergency', 'Other'];
const STAFF_SUBROLES = ['Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Radiology Technician', 'Billing Staff', 'Ward Manager'];
const URGENCY = ['Routine', 'Standard', 'High', 'Critical', 'Emergency'];

const PAGINATION = {
  page: s.int({ minimum: 1, description: 'Page number. Invalid or missing values fall back to 1 (no 400).' }),
  limit: s.int({ minimum: 1, description: 'Page size. Invalid values fall back to the default; values above the maximum are clamped (default 10, max 100 unless stated).' }),
};
const timeSlot = (required) => s.obj({ startTime: s.time(), endTime: s.time() }, required ? ['startTime', 'endTime'] : []);
const medicalHistoryBody = s.obj({ condition: s.str({ minLength: 2, maxLength: 200 }), diagnosedDate: s.date(), status: s.enum(['Active', 'Resolved', 'Chronic']), notes: s.str({ maxLength: 2000 }) }, ['condition', 'diagnosedDate', 'status']);
const clinicalConfirmBody = (amendRequired) => s.obj({
  confirmed: { const: true, description: 'Explicit clinician confirmation; anything other than true is rejected' },
  content: s.str({ minLength: 10, maxLength: 12000 }),
  amendmentNote: s.str({ minLength: amendRequired ? 3 : 0, maxLength: 500 }),
}, amendRequired ? ['confirmed', 'content', 'amendmentNote'] : ['confirmed', 'content']);
const AI_COMMON = { tag: 'AI', limiter: 'ai', audit: 'AiAuditEvent (metadata only: agent, source, model, degraded, success, duration; no prompt or response content)' };
const AI_VIS = 'Patients never see provider, model, or fallback details in the UI; responses carry source metadata (sourceType, requiresHumanReview, limitations) and are decision support only — not a diagnosis. Emergency responses include emergencyContacts (and tel: actions in chat) chosen from location packs: patients by their profile state, staff by the hospital location (HOSPITAL_COUNTRY / HOSPITAL_STATE). The location is never sent to the AI provider.';

const e = (method, path, def) => ({ method, path, auth: 'jwt', state: method === 'get' ? 'read' : 'write', limiter: 'api', errors: [], ...def });

const endpoints = [
  // ── Root & health ──────────────────────────────────────────────────────
  e('get', '/', { tag: 'System', summary: 'API banner', handler: 'server.js inline', auth: 'public', roles: [], success: { status: 200, keys: { message: s.str(), health: s.str() } }, limiter: 'none' }),
  e('get', '/health', { tag: 'System', summary: 'Liveness/readiness with a database round trip', handler: 'server.js inline', auth: 'public', roles: [], success: { status: 200, raw: s.obj({ status: s.enum(['ok']), database: s.str(), timestamp: s.dateTime() }) }, errors: [503], limiter: 'none' }),

  // ── Auth ───────────────────────────────────────────────────────────────
  e('post', '/api/auth/register', { auditNote: 'ACCOUNT_REGISTERED', tag: 'Auth', summary: 'Self-register a patient account', handler: 'authController.register', auth: 'public', roles: [], limiter: 'auth',
    body: s.obj({ name: s.str(), email: s.str({ format: 'email' }), password: s.str({ minLength: 8, description: 'Must contain lowercase, uppercase, and a digit' }), phone: s.str(), dateOfBirth: s.date(), gender: s.enum(GENDER), address: s.ref('Address') }, ['name', 'email', 'password', 'phone']),
    success: { status: 201, keys: { message: s.str(), user: s.ref('User'), token: s.str({ description: 'JWT (intentional credential)' }) } }, errors: [400, 409, 500],
    notes: 'Creates a User with role Patient and a linked Patient profile in one transaction.' }),
  e('post', '/api/auth/login', { auditNote: 'LOGIN_SUCCEEDED, LOGIN_FAILED, ACCOUNT_LOCKED, LOGIN_BLOCKED_LOCKED, LOGIN_DENIED_INACTIVE', tag: 'Auth', summary: 'Log in and receive a JWT', handler: 'authController.login', auth: 'public', roles: [], limiter: 'auth', state: 'read',
    body: s.obj({ email: s.str({ format: 'email' }), password: s.str() }, ['email', 'password']),
    success: { status: 200, keys: { token: s.str(), user: s.ref('User') } }, errors: [400, 401, 429, 500], notes: 'Deactivated accounts receive 401. After LOGIN_MAX_FAILED_ATTEMPTS (default 5) wrong passwords the account is locked for LOGIN_LOCK_MINUTES (default 15): 429 with code ACCOUNT_LOCKED.' }),
  e('post', '/api/auth/forgot-password', { auditNote: 'PASSWORD_RESET_REQUESTED (existing accounts only; response unchanged)', tag: 'Auth', summary: 'Request a password-reset email', handler: 'authController.forgotPassword', auth: 'public', roles: [], limiter: 'auth',
    body: s.obj({ email: s.str({ format: 'email' }) }, ['email']), success: { status: 200, keys: { message: s.str() } }, errors: [400, 500],
    notes: 'Always returns the same generic 200 response whether or not the account exists. Stores only a SHA-256 hash of the 10-minute reset token.' }),
  e('post', '/api/auth/reset-password/{resettoken}', { auditNote: 'PASSWORD_RESET_COMPLETED', tag: 'Auth', summary: 'Reset a password with a reset token', handler: 'authController.resetPassword', auth: 'public', roles: [], limiter: 'auth',
    body: s.obj({ password: s.str({ minLength: 8, description: 'Must contain lowercase, uppercase, and a digit' }) }, ['password']),
    success: { status: 200, keys: { message: s.str(), token: s.str() } }, errors: [400, 500], notes: 'Token is single-use and expires after 10 minutes. Invalid or expired tokens return 400. A successful reset revokes all existing sessions and lifts any lockout.' }),
  e('get', '/api/auth/verify', { tag: 'Auth', summary: 'Validate the current token and return the user', handler: 'authController.verifyToken', roles: ANY, success: { status: 200, keys: { user: s.ref('User') } }, errors: [404, 500] }),
  e('post', '/api/auth/logout', { auditNote: 'LOGGED_OUT', tag: 'Auth', summary: 'Sign out everywhere (revokes all tokens issued to this account)', handler: 'authController.logout', roles: ANY,
    success: { status: 200, keys: { message: s.str() } }, errors: [500], notes: 'Increments the account token version; every previously issued token then returns 401.' }),
  e('get', '/api/auth/me', { tag: 'Auth', summary: 'Current user record (safe fields only)', handler: 'authController.getMe', roles: ANY, success: { status: 200, keys: { data: s.ref('User') } }, errors: [404, 500] }),
  e('get', '/api/auth/my-profile', { tag: 'Auth', summary: 'Current user plus role profile', handler: 'authController.getMyProfile', roles: ANY, success: { status: 200, keys: { user: s.ref('User'), roleProfile: s.obj({}) } }, errors: [404, 500],
    visibility: 'Patients receive their own clinical sub-records in roleProfile.' }),
  e('put', '/api/auth/update-password', { auditNote: 'PASSWORD_CHANGED, PASSWORD_CHANGE_FAILED', tag: 'Auth', summary: 'Change own password', handler: 'authController.updatePassword', roles: ANY,
    body: s.obj({ currentPassword: s.str(), newPassword: s.str({ minLength: 8, description: 'Must contain lowercase, uppercase, and a digit' }) }, ['currentPassword', 'newPassword']),
    success: { status: 200, keys: { message: s.str(), token: s.str() } }, errors: [400, 401, 404, 500], notes: 'Revokes every other session; the response carries a fresh token.' }),
  e('put', '/api/auth/profile', { tag: 'Auth', summary: 'Update own profile', handler: 'authController.updateProfile', roles: ANY,
    body: s.obj({ name: s.str(), phone: s.str(), dateOfBirth: s.date(), gender: s.enum(GENDER), address: s.ref('Address'), avatar: s.str() }), success: { status: 200, keys: { message: s.str(), user: s.ref('User') } }, errors: [400, 404, 500] }),
  e('get', '/api/auth/avatar', { tag: 'Auth', summary: "Download the signed-in user's own uploaded avatar", handler: 'authController.getAvatar', roles: ANY,
    success: { status: 200, binary: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] }, errors: [404, 500], notes: 'Avatars are private files; there is no public URL.' }),
  e('post', '/api/auth/avatar', { tag: 'Auth', summary: 'Upload own avatar image', handler: 'authController.uploadAvatarImage', roles: ANY,
    upload: { field: 'avatar', extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'], mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], maxBytes: 2 * 1024 * 1024, signatureChecked: true, storage: 'private (served only to the owner via GET /api/auth/avatar)' },
    success: { status: 200, keys: { message: s.str(), avatarUrl: s.str() } }, errors: [400, 500] }),

  // ── Dashboards ─────────────────────────────────────────────────────────
  e('get', '/api/dashboards/permissions', { tag: 'Dashboards', summary: 'Static permission map for the caller role (informational)', handler: 'roleAccess.getUserPermissions', roles: ANY,
    success: { status: 200, keys: { role: s.str(), dashboard: s.str(), permissions: s.obj({}), canAccess: s.arr(s.str()) } }, errors: [403],
    notes: 'Informational map only; it is not used for authorization and does not exactly mirror route policy.' }),
  e('get', '/api/dashboards/admin', { tag: 'Dashboards', summary: 'Admin dashboard aggregates', handler: 'dashboardController.getAdminDashboard', roles: [R.admin], success: { status: 200, keys: { role: s.str(), dashboard: s.obj({}), quickActions: s.arr(s.obj({})) } } }),
  e('get', '/api/dashboards/doctor', { tag: 'Dashboards', summary: 'Own doctor dashboard', handler: 'dashboardController.getDoctorDashboard', roles: [R.doctor], record: 'Scoped to the caller doctor profile', success: { status: 200, keys: { role: s.str(), doctorInfo: s.obj({}), dashboard: s.obj({}), quickActions: s.arr(s.obj({})) } }, errors: [404] }),
  e('get', '/api/dashboards/patient', { tag: 'Dashboards', summary: 'Own patient dashboard', handler: 'dashboardController.getPatientDashboard', roles: [R.patient], record: 'Scoped to the caller patient profile', success: { status: 200, keys: { role: s.str(), patientInfo: s.obj({}), dashboard: s.obj({}), quickActions: s.arr(s.obj({})) } }, errors: [404] }),
  e('get', '/api/dashboards/nurse', { tag: 'Dashboards', summary: 'Nurse dashboard', handler: 'dashboardController.getNurseDashboard', roles: [R.nurse], success: { status: 200, keys: { role: s.str(), nurseInfo: s.obj({}), dashboard: s.obj({}), quickActions: s.arr(s.obj({})) } } }),
  e('get', '/api/dashboards/receptionist', { tag: 'Dashboards', summary: 'Receptionist dashboard', handler: 'dashboardController.getReceptionistDashboard', roles: [R.receptionist], success: { status: 200, keys: { role: s.str(), receptionistInfo: s.obj({}), dashboard: s.obj({}), quickActions: s.arr(s.obj({})) } } }),
  e('get', '/api/dashboards/pharmacist', { tag: 'Dashboards', summary: 'Pharmacist dashboard', handler: 'dashboardController.getPharmacistDashboard', roles: [R.pharmacist], success: { status: 200, keys: { role: s.str(), pharmacistInfo: s.obj({}), dashboard: s.obj({}), quickActions: s.arr(s.obj({})) } } }),

  // ── Doctors ────────────────────────────────────────────────────────────
  e('get', '/api/doctors/available-users', { tag: 'Doctors', summary: 'Doctor-role users without a doctor profile', handler: 'doctorController.getAvailableDoctorUsers', roles: [R.admin, R.receptionist], success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('User')) } } }),
  e('get', '/api/doctors', { tag: 'Doctors', summary: 'Active doctor directory', handler: 'doctorController.getDoctors', roles: ANY,
    query: { ...PAGINATION, specialization: s.str(), department: s.str(), isAvailable: s.enum(['true', 'false']), search: s.str() },
    success: { status: 200, keys: { count: s.int(), total: s.int(), page: s.int(), pages: s.int(), data: s.arr(s.ref('Doctor')) } } }),
  e('post', '/api/doctors', { auditEvent: 'DOCTOR_CREATED', tag: 'Doctors', summary: 'Create a doctor (new user or existing doctor-role user)', handler: 'doctorController.createDoctor', roles: [R.admin, R.receptionist],
    body: s.obj({ userId: s.id(), name: s.str(), email: s.str({ format: 'email' }), phone: s.str(), gender: s.enum(GENDER), dateOfBirth: s.date(), specialization: s.str(), qualification: s.str({ minLength: 2, maxLength: 200 }), experience: s.int({ minimum: 0, maximum: 80 }), licenseNumber: s.str({ minLength: 3, maxLength: 100 }), department: s.str(), consultationFee: s.num({ minimum: 0, maximum: 1000000 }), availability: s.arr(s.obj({}), { maxItems: 7 }) }, ['specialization']),
    success: { status: 201, keys: { message: s.str(), data: s.ref('Doctor') } }, errors: [400, 409],
    notes: 'A newly created user receives the configured default-password workflow (documented separately; no value is published here).' }),
  e('get', '/api/doctors/{id}', { tag: 'Doctors', summary: 'Doctor profile', handler: 'doctorController.getDoctor', roles: ANY, success: { status: 200, keys: { data: s.ref('Doctor') } }, errors: [404] }),
  e('put', '/api/doctors/{id}', { auditEvent: 'DOCTOR_UPDATED', tag: 'Doctors', summary: 'Update a doctor profile', handler: 'doctorController.updateDoctor', roles: [R.admin, R.receptionist, R.doctor], owner: 'doctor', record: 'requireDoctorAccess: Admin/Receptionist, or the doctor editing their own profile',
    body: s.obj({ specialization: s.str(), qualification: s.str(), experience: s.int({ minimum: 0, maximum: 80 }), licenseNumber: s.str({ minLength: 3, maxLength: 100 }), department: s.str(), consultationFee: s.num({ minimum: 0, maximum: 1000000 }), availability: s.arr(s.obj({}), { maxItems: 7 }), isAvailable: s.bool() }),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Doctor') } }, errors: [400, 404, 409] }),
  e('delete', '/api/doctors/{id}', { auditEvent: 'DOCTOR_DEACTIVATED', tag: 'Doctors', summary: 'Deactivate a doctor (soft)', handler: 'doctorController.deleteDoctor', roles: [R.admin], success: { status: 200, keys: { message: s.str() } }, errors: [404, 409],
    notes: 'Deactivates the doctor profile and user; 409 when upcoming active appointments exist.' }),
  e('get', '/api/doctors/{id}/schedule', { tag: 'Doctors', summary: 'Doctor schedule', handler: 'doctorController.getDoctorSchedule', roles: ANY, success: { status: 200, keys: { data: s.obj({}) } }, errors: [404] }),
  e('put', '/api/doctors/{id}/availability', { auditEvent: 'DOCTOR_AVAILABILITY_UPDATED', tag: 'Doctors', summary: 'Replace weekly availability', handler: 'doctorController.updateAvailability', roles: [R.admin, R.receptionist, R.doctor], owner: 'doctor', record: 'requireDoctorAccess (own profile for doctors)',
    body: s.obj({ availability: s.arr(s.obj({ day: s.str(), slots: s.arr(s.obj({ startTime: s.time(), endTime: s.time(), isAvailable: s.bool() })) })) }, ['availability']),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Doctor') } }, errors: [400, 404] }),
  e('post', '/api/doctors/{id}/oncall', { tag: 'Doctors', summary: 'Add an on-call shift', handler: 'doctorController.addOnCallShift', roles: [R.admin, R.receptionist],
    body: s.obj({ date: s.str(), startTime: s.str(), endTime: s.str() }, ['date', 'startTime', 'endTime']), success: { status: 200, keys: { message: s.str(), data: s.ref('Doctor') } }, errors: [400, 404] }),
  e('get', '/api/doctors/{id}/appointments', { tag: 'Doctors', summary: "A doctor's appointments", handler: 'doctorController.getDoctorAppointments', roles: [R.admin, R.receptionist, R.nurse, R.doctor], owner: 'doctor', record: 'requireDoctorAccess: Admin/Receptionist/Nurse, or the doctor themself',
    success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Appointment')) } }, errors: [404] }),

  // ── Patients ───────────────────────────────────────────────────────────
  e('get', '/api/patients/available-users', { tag: 'Patients', summary: 'Patient-role users without a patient profile', handler: 'patientController.getAvailablePatientUsers', roles: [R.admin, R.receptionist], success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('User')) } } }),
  e('get', '/api/patients/diagnostic-workspace', { tag: 'Patients', summary: 'Privacy-reduced diagnostic queue', handler: 'patientController.getDiagnosticWorkspace', roles: [R.lab, R.radiology],
    record: 'Reports filtered to the caller modality (lab vs radiology); patient identity reduced to name and patient ID', success: { status: 200, keys: { data: s.obj({ patients: s.arr(s.obj({})), recentReports: s.arr(s.ref('LabReport')), overview: s.obj({}) }) } } }),
  e('get', '/api/patients/diagnostic-workspace/{id}', { auditEvent: 'DIAGNOSTIC_RECORDS_VIEWED', tag: 'Patients', summary: 'Diagnostic reports for one patient (own modality)', handler: 'patientController.getDiagnosticRecords', roles: [R.lab, R.radiology], record: 'Modality-filtered', success: { status: 200, keys: { data: s.obj({ patient: s.obj({}), labReports: s.arr(s.ref('LabReport')) }) } }, errors: [404] }),
  e('post', '/api/patients/heal-orphans', { tag: 'Patients', summary: 'Create missing patient profiles for patient-role users', handler: 'patientsRoutes.js inline', roles: [R.admin], success: { status: 200, keys: { message: s.str(), count: s.int() } }, errors: [500] }),
  e('get', '/api/patients/search', { tag: 'Patients', summary: 'Identity search for booking/registration', handler: 'patientsRoutes.js inline', roles: [R.admin, R.doctor, R.nurse, R.receptionist],
    query: { q: s.str({ maxLength: 100, description: 'Matched against name, phone, email, patient ID; truncated to 100 characters' }) }, success: { status: 200, keys: { data: s.arr(s.ref('PatientIdentity')) } }, errors: [500],
    visibility: 'Identity fields only (no clinical, insurance, or emergency-contact data). Not care-scoped so a first appointment can be booked.' }),
  e('get', '/api/patients', { tag: 'Patients', summary: 'Patient list (role-projected)', handler: 'patientController.getPatients', roles: [R.admin, R.doctor, R.nurse, R.receptionist, R.patient, R.ward, R.pharmacist, R.billing],
    query: { ...PAGINATION, search: s.str(), bloodGroup: s.enum(BLOOD_GROUPS) },
    record: 'Patient: self only. Doctor: only patients in a care relationship. Others: every active patient with a role-specific projection.',
    visibility: 'Never includes clinical sub-records. Admin/Receptionist: registration fields. Doctor: identity + bloodGroup/allergies/emergencyContact. Nurse/Ward Manager: identity only. Pharmacist: identity + allergies. Billing Staff: identity, address, insurance.',
    success: { status: 200, keys: { count: s.int(), total: s.int(), page: s.int(), pages: s.int(), data: s.arr(s.ref('PatientSummary')) } } , errors: [400] }),
  e('post', '/api/patients', { auditEvent: 'PATIENT_CREATED', tag: 'Patients', summary: 'Register a patient', handler: 'patientController.createPatient', roles: [R.admin, R.receptionist],
    body: s.obj({ userId: s.id(), name: s.str(), email: s.str({ format: 'email' }), phone: s.str(), gender: s.enum(GENDER), dateOfBirth: s.date(), bloodGroup: s.enum(BLOOD_GROUPS), emergencyContact: s.obj({}), allergies: s.arr(s.str()), insuranceInfo: s.obj({}) }),
    success: { status: 201, keys: { message: s.str(), data: s.ref('Patient') } }, errors: [400, 409],
    notes: 'Requires userId, or name+email+phone for a new user (who receives the configured default-password workflow).' }),
  e('get', '/api/patients/{id}', { auditEvent: 'PATIENT_VIEWED', tag: 'Patients', summary: 'Patient detail', handler: 'patientController.getPatient', roles: [R.admin, R.doctor, R.nurse, R.receptionist, R.ward, R.pharmacist], owner: 'patient', careScope: true,
    record: 'requirePatientAccess with owner access and care scope', visibility: 'Clinical sub-records only for Admin, care-scoped Doctor/Nurse, and the owner; Receptionist/Pharmacist/Ward Manager receive their summary projection.',
    success: { status: 200, keys: { data: s.ref('Patient') } }, errors: [404] }),
  e('put', '/api/patients/{id}', { auditEvent: 'PATIENT_UPDATED', tag: 'Patients', summary: 'Update patient profile fields', handler: 'patientController.updatePatient', roles: [R.admin, R.doctor, R.nurse, R.receptionist], owner: 'patient', careScope: true,
    record: 'Owner may update emergencyContact/insuranceInfo only; bloodGroup/allergies by staff only (owner attempt → 403).',
    body: s.obj({ bloodGroup: s.enum(BLOOD_GROUPS), emergencyContact: s.obj({}), allergies: s.arr(s.str()), insuranceInfo: s.obj({}) }), success: { status: 200, keys: { message: s.str(), data: s.ref('Patient') } }, errors: [400, 404] }),
  e('delete', '/api/patients/{id}', { auditEvent: 'PATIENT_ARCHIVED', tag: 'Patients', summary: 'Archive a patient (soft) and deactivate the user', handler: 'patientController.deletePatient', roles: [R.admin],
    body: s.obj({ reason: s.str() }), success: { status: 200, keys: { message: s.str() } }, errors: [404, 409], audit: 'ClinicalAuditEvent ARCHIVED', notes: '409 when the patient occupies a bed. Clinical records are retained.' }),
  e('get', '/api/patients/{id}/medical-records', { auditEvent: 'MEDICAL_RECORDS_VIEWED', tag: 'Patients', summary: 'Clinical record (history, labs, medications)', handler: 'patientController.getPatientMedicalRecords', roles: [R.admin, R.doctor, R.nurse], owner: 'patient', careScope: true,
    success: { status: 200, keys: { data: s.ref('Patient') } }, errors: [404] }),
  e('get', '/api/patients/{id}/appointments', { auditEvent: 'PATIENT_APPOINTMENTS_VIEWED', tag: 'Patients', summary: "A patient's appointments", handler: 'patientController.getPatientAppointments', roles: [R.admin, R.doctor, R.nurse, R.receptionist], owner: 'patient', careScope: true,
    success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Appointment')) } }, errors: [404] }),
  e('get', '/api/patients/{id}/stats', { tag: 'Patients', summary: 'Patient statistics', handler: 'patientController.getPatientStats', roles: [R.admin, R.doctor, R.nurse, R.receptionist], owner: 'patient', careScope: true, success: { status: 200, keys: { data: s.obj({}) } }, errors: [404] }),
  e('post', '/api/patients/{id}/medical-history', { tag: 'Clinical records', summary: 'Add a medical-history entry', handler: 'patientController.addMedicalHistory', roles: [R.doctor, R.nurse], careScope: true,
    record: 'Staff only — the patient owner is rejected (403).', body: medicalHistoryBody, success: { status: 200, keys: { message: s.str(), data: s.ref('Patient') } }, errors: [400, 404], audit: 'ClinicalAuditEvent CREATED' }),
  e('put', '/api/patients/{id}/medical-history/{historyId}', { tag: 'Clinical records', summary: 'Update a medical-history entry', handler: 'patientController.updateMedicalHistory', roles: [R.doctor, R.nurse], careScope: true, record: 'Staff only.',
    body: s.obj({ condition: s.str({ minLength: 2, maxLength: 200 }), diagnosedDate: s.date(), status: s.enum(['Active', 'Resolved', 'Chronic']), notes: s.str({ maxLength: 2000 }), reason: s.str({ maxLength: 500 }) }),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Patient') } }, errors: [400, 404], audit: 'ClinicalAuditEvent AMENDED (before/after, reason)' }),
  e('delete', '/api/patients/{id}/medical-history/{historyId}', { tag: 'Clinical records', summary: 'Void a medical-history entry (soft, with reason)', handler: 'patientController.deleteMedicalHistory', roles: [R.doctor, R.nurse], careScope: true, record: 'Staff only.',
    body: s.obj({ reason: s.str({ minLength: 3, maxLength: 500 }) }, ['reason']), success: { status: 200, keys: { message: s.str(), data: s.ref('Patient') } }, errors: [400, 404], audit: 'ClinicalAuditEvent VOIDED' }),
  e('post', '/api/patients/{id}/lab-report', { tag: 'Clinical records', summary: 'Create a lab/radiology report', handler: 'patientController.addLabReport', roles: [R.doctor, R.nurse, R.lab, R.radiology], careScope: true,
    record: 'Staff only. Diagnostic staff limited to their modality (radiology types: X-Ray, CT Scan, MRI Scan, Ultrasound, Echocardiogram).',
    body: s.obj({ testName: s.str({ minLength: 2, maxLength: 200 }), testType: s.str(), lab: s.str(), testDate: s.date(), reportDate: s.date(), status: s.enum(LAB_STATUS), result: s.str({ maxLength: 5000 }), results: s.str({ maxLength: 5000 }), referenceRange: s.str(), normalRange: s.str(), notes: s.str({ maxLength: 2000 }), remarks: s.str({ maxLength: 2000 }) }, ['testName']),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Patient') } }, errors: [400, 404], audit: 'ClinicalAuditEvent CREATED' }),
  e('post', '/api/patients/{id}/lab-report/{reportId}/attachment', { auditEvent: 'ATTACHMENT_UPLOADED', tag: 'Clinical records', summary: 'Upload or replace a report attachment', handler: 'patientController.uploadLabReportAttachment', roles: [R.doctor, R.nurse, R.lab, R.radiology], careScope: true,
    record: 'Staff only; diagnostic staff limited to their modality. Replacing requires replace=true (otherwise 409).',
    upload: { field: 'attachment', extensions: ['.pdf', '.jpg', '.jpeg', '.png'], mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxBytes: 10 * 1024 * 1024, signatureChecked: true, storage: 'private (never served statically; download only via the authorized route)', extraFields: { replace: s.enum(['true']) } },
    success: { status: 200, keys: { message: s.str(), data: s.obj({ attachmentOriginalName: s.str(), attachmentMimeType: s.str(), attachmentSize: s.int(), attachmentUploadedAt: s.dateTime() }) } }, errors: [400, 404, 409] }),
  e('get', '/api/patients/{id}/lab-report/{reportId}/attachment', { auditEvent: 'ATTACHMENT_DOWNLOADED', tag: 'Clinical records', summary: 'Download a report attachment', handler: 'patientController.downloadLabReportAttachment', roles: [R.admin, R.doctor, R.nurse, R.lab, R.radiology], owner: 'patient', careScope: true,
    record: 'Owner, Admin, care-scoped Doctor/Nurse; diagnostic staff limited to their modality.', success: { status: 200, binary: ['application/pdf', 'image/jpeg', 'image/png'] }, errors: [404], matrixDeny: [R.radiology] }),
  e('get', '/api/patients/{id}/clinical-notes', { auditEvent: 'CLINICAL_NOTES_VIEWED', tag: 'Clinical notes', summary: 'List clinical notes and drafts', handler: 'clinicalNoteController.listClinicalNotes', roles: [R.admin, R.doctor, R.nurse], careScope: true,
    record: 'Staff only — includes unreviewed AI/record-derived drafts, so not patient-facing.', success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('ClinicalNote')) } }, errors: [404] }),
  e('post', '/api/patients/{id}/clinical-notes/drafts', { tag: 'Clinical notes', summary: 'Save an unverified draft (separate from the medical record)', handler: 'clinicalNoteController.createClinicalDraft', roles: [R.doctor, R.nurse], careScope: true,
    body: s.obj({ title: s.str({ minLength: 3, maxLength: 200 }), content: s.str({ minLength: 10, maxLength: 12000 }), source: s.enum(['ai', 'record-derived']), sourceAgent: s.str({ maxLength: 100 }) }, ['title', 'content', 'source']),
    success: { status: 201, keys: { message: s.str(), data: s.ref('ClinicalNote') } }, errors: [400, 404], audit: 'ClinicalAuditEvent DRAFT_CREATED' }),
  e('post', '/api/patients/{id}/clinical-notes/{noteId}/review', { tag: 'Clinical notes', summary: 'Clinician review with explicit confirmation (creates a new version)', handler: 'clinicalNoteController.reviewClinicalNote', roles: [R.doctor], careScope: true,
    body: clinicalConfirmBody(false), success: { status: 200, keys: { message: s.str(), data: s.ref('ClinicalNote') } }, errors: [400, 404, 409], audit: 'ClinicalAuditEvent CLINICIAN_REVIEWED' }),
  e('post', '/api/patients/{id}/clinical-notes/{noteId}/amend', { tag: 'Clinical notes', summary: 'Amend a reviewed note (new version, prior versions kept)', handler: 'clinicalNoteController.amendClinicalNote', roles: [R.doctor], careScope: true,
    body: clinicalConfirmBody(true), success: { status: 200, keys: { message: s.str(), data: s.ref('ClinicalNote') } }, errors: [400, 404, 409], audit: 'ClinicalAuditEvent AMENDED' }),

  // ── Appointments ───────────────────────────────────────────────────────
  e('get', '/api/appointments/availability/{doctorId}', { tag: 'Appointments', summary: 'Open slots for a doctor on a date', handler: 'appointmentController.getDoctorAvailability', roles: ANY,
    query: { date: s.date() }, requiredQuery: ['date'], success: { status: 200, keys: { data: s.obj({}) } }, errors: [400, 404, 409] }),
  e('get', '/api/appointments', { tag: 'Appointments', summary: 'Appointment list', handler: 'appointmentController.getAppointments', roles: [R.admin, R.doctor, R.patient, R.nurse, R.receptionist],
    query: { doctor: s.id(), patient: s.id(), status: s.enum(APPOINTMENT_STATUS), date: s.date(), priority: s.enum(['Normal', 'Urgent', 'Emergency']), search: s.str() },
    record: 'Patient: own. Doctor: own. Others: all, with minimal patient/doctor identity.', notes: 'Not paginated.', success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Appointment')) } } , errors: [400] }),
  e('post', '/api/appointments', { auditEvent: 'APPOINTMENT_CREATED', tag: 'Appointments', summary: 'Book an appointment (idempotent with bookingKey)', handler: 'appointmentController.createAppointment', roles: [R.admin, R.receptionist, R.doctor, R.patient],
    record: 'A patient always books for themself (the patient field is ignored/forced).',
    body: s.obj({ patient: s.id(), doctor: s.id(), appointmentDate: s.date(), timeSlot: timeSlot(true), type: s.enum(['Consultation', 'Follow-up', 'Emergency', 'Surgery']), priority: s.enum(['Normal', 'Urgent', 'Emergency']), bookingKey: s.str({ minLength: 8, maxLength: 100 }), symptoms: s.str({ maxLength: 2000 }) }, ['doctor', 'appointmentDate', 'timeSlot', 'type']),
    success: { status: 201, keys: { replayed: s.bool(), data: s.ref('Appointment') } }, errors: [400, 404, 409],
    notes: 'Replaying the same bookingKey returns 200 with replayed=true. Competing active slot → 409 slot_conflict.' }),
  e('get', '/api/appointments/{id}', { tag: 'Appointments', summary: 'Appointment detail', handler: 'appointmentController.getAppointment', roles: [R.admin, R.nurse, R.receptionist, R.patient, R.doctor], owner: 'patient-or-doctor',
    record: 'requireAppointmentAccess: Admin/Nurse/Receptionist, the owning patient, or the assigned doctor', success: { status: 200, keys: { data: s.ref('Appointment') } }, errors: [404] }),
  e('put', '/api/appointments/{id}', { auditEvent: 'APPOINTMENT_UPDATED', tag: 'Appointments', summary: 'Update an appointment (status transitions enforced)', handler: 'appointmentController.updateAppointment', roles: [R.admin, R.doctor, R.receptionist], owner: 'doctor',
    record: 'Admin/Receptionist or the assigned doctor',
    body: s.obj({ status: s.enum(APPOINTMENT_STATUS), timeSlot: timeSlot(false), appointmentDate: s.date(), priority: s.str(), type: s.str(), symptoms: s.str(), diagnosis: s.str(), notes: s.str(), consultationFee: s.num(), paid: s.bool(), paymentMethod: s.enum(PAYMENT_METHODS) }),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Appointment') } }, errors: [400, 404, 409],
    notes: 'Allowed transitions: Scheduled→Confirmed/Cancelled/No-Show; Confirmed→In-Progress/Cancelled/No-Show; In-Progress→Completed/Cancelled. Completing generates one consultation bill (idempotent by source key).' }),
  e('put', '/api/appointments/{id}/cancel', { auditEvent: 'APPOINTMENT_CANCELLED', tag: 'Appointments', summary: 'Cancel an appointment', handler: 'appointmentController.cancelAppointment', roles: [R.admin, R.doctor, R.receptionist, R.patient], owner: 'patient-or-doctor',
    record: 'Admin/Receptionist, the owning patient, or the assigned doctor', body: s.obj({ reason: s.str() }), success: { status: 200, keys: { message: s.str(), data: s.ref('Appointment') } }, errors: [400, 404, 409] }),
  e('put', '/api/appointments/{id}/reschedule', { auditEvent: 'APPOINTMENT_RESCHEDULED', tag: 'Appointments', summary: 'Reschedule to an available slot', handler: 'appointmentController.rescheduleAppointment', roles: [R.admin, R.doctor, R.receptionist], owner: 'doctor',
    record: 'Admin/Receptionist or the assigned doctor (patients cannot reschedule)', body: s.obj({ appointmentDate: s.date(), timeSlot: timeSlot(true) }, ['appointmentDate', 'timeSlot']),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Appointment') } }, errors: [400, 404, 409] }),

  // ── Wards ──────────────────────────────────────────────────────────────
  e('get', '/api/wards', { tag: 'Wards', summary: 'Wards with beds', handler: 'wardController.getWards', roles: [R.admin, R.doctor, R.nurse, R.receptionist, R.ward],
    query: { wardType: s.enum(WARD_TYPE), gender: s.enum(WARD_GENDER), available: s.enum(['true']) }, visibility: 'Bed occupants: identity only.', success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Ward')) } } , errors: [400] }),
  e('post', '/api/wards', { tag: 'Wards', summary: 'Create a ward', handler: 'wardController.createWard', roles: [R.admin],
    body: s.obj({ wardNumber: s.str(), wardName: s.str(), wardType: s.enum(WARD_TYPE), department: s.str(), floor: s.int(), totalBeds: s.int({ minimum: 1, maximum: 500 }), gender: s.enum(WARD_GENDER), facilities: s.arr(s.str()), dailyRate: s.num({ minimum: 0 }) }, ['wardNumber', 'wardName', 'totalBeds']),
    success: { status: 201, keys: { data: s.ref('Ward') } }, errors: [400, 409] }),
  e('get', '/api/wards/{id}', { tag: 'Wards', summary: 'Ward detail', handler: 'wardController.getWard', roles: [R.admin, R.doctor, R.nurse, R.receptionist, R.ward], success: { status: 200, keys: { data: s.ref('Ward') } }, errors: [404] }),
  e('put', '/api/wards/{id}', { tag: 'Wards', summary: 'Update ward details', handler: 'wardController.updateWard', roles: [R.admin],
    body: s.obj({ wardName: s.str(), wardType: s.enum(WARD_TYPE), department: s.str(), floor: s.int(), gender: s.enum(WARD_GENDER), facilities: s.arr(s.str()), dailyRate: s.num({ minimum: 0 }) }), success: { status: 200, keys: { data: s.ref('Ward') } }, errors: [400, 404] }),
  e('delete', '/api/wards/{id}', { tag: 'Wards', summary: 'Archive a ward', handler: 'wardController.deleteWard', roles: [R.admin], success: { status: 200, keys: { message: s.str() } }, errors: [400, 404], notes: '400 when any bed is occupied.' }),
  e('post', '/api/wards/{id}/allocate', { auditEvent: 'BED_ASSIGNED', tag: 'Wards', summary: 'Assign the next free bed (legacy)', handler: 'wardTransactionController.assignBed', roles: [R.admin, R.nurse, R.receptionist, R.ward],
    body: s.obj({ patientId: s.id(), admissionDate: s.dateTime(), expectedDischargeDate: s.dateTime() }, ['patientId']), success: { status: 200, keys: { replayed: s.bool(), message: s.str(), data: s.ref('Ward') } }, errors: [400, 404, 409] }),
  e('post', '/api/wards/{id}/release', { auditEvent: 'BED_DISCHARGED', tag: 'Wards', summary: 'Discharge by bed number (legacy, idempotent)', handler: 'wardTransactionController.dischargeBed', roles: [R.admin, R.nurse, R.receptionist, R.ward],
    body: s.obj({ bedNumber: s.str(), idempotencyKey: s.uuid() }, ['bedNumber', 'idempotencyKey']), success: { status: 200, keys: { replayed: s.bool(), message: s.str(), data: s.ref('Ward'), wardBill: s.ref('Bill') } }, errors: [400, 404, 409] }),
  e('post', '/api/wards/{id}/assign', { auditEvent: 'BED_ASSIGNED', tag: 'Wards', summary: 'Assign a specific bed', handler: 'wardTransactionController.assignBed', roles: [R.admin, R.nurse, R.receptionist, R.ward, R.doctor],
    body: s.obj({ patientId: s.id(), bedId: s.id(), admissionDate: s.dateTime(), expectedDischargeDate: s.dateTime() }, ['patientId', 'bedId']), success: { status: 200, keys: { replayed: s.bool(), message: s.str(), data: s.ref('Ward') } }, errors: [400, 404, 409],
    notes: 'Bed occupied / patient already in another bed → 409; repeat of the same assignment → 200 replayed.' }),
  e('post', '/api/wards/{id}/discharge', { auditEvent: 'BED_DISCHARGED', tag: 'Wards', summary: 'Discharge a specific bed (idempotent; generates a ward bill)', handler: 'wardTransactionController.dischargeBed', roles: [R.admin, R.nurse, R.receptionist, R.ward, R.doctor],
    body: s.obj({ bedId: s.id(), idempotencyKey: s.uuid() }, ['bedId', 'idempotencyKey']), success: { status: 200, keys: { replayed: s.bool(), message: s.str(), data: s.ref('Ward'), wardBill: s.ref('Bill') } }, errors: [400, 404, 409] }),

  // ── Medicines ──────────────────────────────────────────────────────────
  e('get', '/api/medicines/stats', { tag: 'Medicines', summary: 'Inventory statistics', handler: 'medicineController.getMedicineStats', roles: [R.admin, R.pharmacist, R.doctor], success: { status: 200, keys: { data: s.obj({}) } } }),
  e('get', '/api/medicines/categories', { tag: 'Medicines', summary: 'Medicine categories', handler: 'medicineController.getMedicineCategories', roles: ANY, success: { status: 200, keys: { count: s.int(), data: s.arr(s.any()) } } }),
  e('get', '/api/medicines/alerts/low-stock', { tag: 'Medicines', summary: 'Low-stock medicines', handler: 'medicineController.getLowStockAlert', roles: [R.admin, R.pharmacist], success: { status: 200, keys: { stats: s.obj({}), count: s.int(), data: s.arr(s.ref('Medicine')) } } }),
  e('get', '/api/medicines/alerts/expiring', { tag: 'Medicines', summary: 'Medicines expiring soon', handler: 'medicineController.getExpiringMedicines', roles: [R.admin, R.pharmacist], query: { months: s.int({ minimum: 1 }) }, success: { status: 200, keys: { stats: s.obj({}), count: s.int(), data: s.arr(s.ref('Medicine')) } } , errors: [400] }),
  e('get', '/api/medicines/alerts/expired', { tag: 'Medicines', summary: 'Expired medicines', handler: 'medicineController.getExpiredMedicines', roles: [R.admin, R.pharmacist], success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Medicine')) } } }),
  e('get', '/api/medicines', { tag: 'Medicines', summary: 'Active medicine catalog', handler: 'medicineController.getMedicines', roles: ANY,
    query: { ...PAGINATION, category: s.enum(MEDICINE_CATEGORY), search: s.str(), lowStock: s.enum(['true']), expiringSoon: s.enum(['true']) }, success: { status: 200, keys: { count: s.int(), total: s.int(), page: s.int(), pages: s.int(), data: s.arr(s.ref('Medicine')) } } , errors: [400] }),
  e('post', '/api/medicines', { tag: 'Medicines', summary: 'Add a medicine', handler: 'medicineController.createMedicine', roles: [R.admin, R.pharmacist],
    body: s.obj({ name: s.str(), genericName: s.str(), manufacturer: s.str(), category: s.enum(MEDICINE_CATEGORY), dosageForm: s.enum(DOSAGE_FORM), strength: s.str(), unitPrice: s.num({ minimum: 0 }), stockQuantity: s.int({ minimum: 0 }), reorderLevel: s.int({ minimum: 0 }), expiryDate: s.date(), batchNumber: s.str(), prescriptionRequired: s.bool() }, ['name', 'genericName', 'manufacturer', 'category', 'unitPrice', 'stockQuantity', 'reorderLevel', 'expiryDate']),
    success: { status: 201, keys: { message: s.str(), data: s.ref('Medicine') } }, errors: [400, 409] }),
  e('get', '/api/medicines/{id}', { tag: 'Medicines', summary: 'Medicine detail', handler: 'medicineController.getMedicine', roles: ANY, success: { status: 200, keys: { data: s.ref('Medicine') } }, errors: [404] }),
  e('put', '/api/medicines/{id}', { tag: 'Medicines', summary: 'Update a medicine', handler: 'medicineController.updateMedicine', roles: [R.admin, R.pharmacist],
    body: s.obj({ name: s.str(), genericName: s.str(), manufacturer: s.str(), category: s.enum(MEDICINE_CATEGORY), dosageForm: s.enum(DOSAGE_FORM), strength: s.str(), unitPrice: s.num({ minimum: 0 }), stockQuantity: s.int({ minimum: 0 }), reorderLevel: s.int({ minimum: 0 }), expiryDate: s.date(), isActive: s.bool() }),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Medicine') } }, errors: [400, 404] }),
  e('delete', '/api/medicines/{id}', { auditEvent: 'MEDICINE_REMOVED', tag: 'Medicines', summary: 'Remove a medicine (deactivated if referenced by prescriptions)', handler: 'medicineController.deleteMedicine', roles: [R.admin],
    success: { status: 200, keys: { message: s.str(), deactivated: s.bool() } }, errors: [404], notes: 'Medicines referenced by any prescription are deactivated instead of deleted so prescription history is preserved.' }),
  e('put', '/api/medicines/{id}/stock', { auditEvent: 'MEDICINE_STOCK_ADJUSTED', tag: 'Medicines', summary: 'Adjust stock (add / reduce / set)', handler: 'medicineController.updateStock', roles: [R.admin, R.pharmacist],
    body: s.obj({ quantity: s.int({ minimum: 1 }), operation: s.enum(['add', 'reduce', 'set']), batchNumber: s.str(), expiryDate: s.date() }, ['quantity', 'operation']),
    success: { status: 200, keys: { message: s.str(), data: s.ref('Medicine') } }, errors: [400, 404], notes: '"reduce" is atomic: it never drives stock below zero, even under concurrent requests.' }),

  // ── Prescriptions ──────────────────────────────────────────────────────
  e('get', '/api/prescriptions', { tag: 'Prescriptions', summary: 'Prescription list', handler: 'prescriptionController.getPrescriptions', roles: [R.admin, R.doctor, R.nurse, R.patient, R.pharmacist],
    query: { ...PAGINATION, status: s.enum(['Pending', 'Partially-Filled', 'Fulfilled', 'Cancelled']), startDate: s.date(), endDate: s.date() },
    record: 'Patient: own. Doctor: own prescriptions. Nurse: active-encounter patients only. Admin/Pharmacist: all.', visibility: 'Patient fields: identity plus allergies.',
    success: { status: 200, keys: { count: s.int(), total: s.int(), page: s.int(), pages: s.int(), data: s.arr(s.ref('Prescription')) } }, notes: 'Default page size 50, max 100.' , errors: [400] }),
  e('post', '/api/prescriptions', { auditEvent: 'PRESCRIPTION_CREATED', tag: 'Prescriptions', summary: 'Create a prescription', handler: 'prescriptionController.createPrescription', roles: [R.doctor],
    body: s.obj({ patient: s.id(), appointment: s.id(), medicines: s.arr(s.obj({ medicine: s.id(), quantity: s.int({ minimum: 1, maximum: 10000 }), dosage: s.str({ maxLength: 100 }), frequency: s.str({ maxLength: 100 }), duration: s.str({ maxLength: 100 }), instructions: s.str() }, ['medicine', 'quantity', 'dosage', 'frequency', 'duration']), { minItems: 1, maxItems: 50 }), diagnosis: s.str(), symptoms: s.str(), labTests: s.arr(s.str()), validUntil: s.date(), refillsAllowed: s.int({ minimum: 0, maximum: 12 }), notes: s.str() }, ['patient', 'medicines']),
    success: { status: 201, keys: { message: s.str(), data: s.ref('Prescription') } }, errors: [400, 404], notes: 'A linked appointment must belong to the same patient and prescribing doctor.' }),
  e('get', '/api/prescriptions/{id}', { auditEvent: 'PRESCRIPTION_VIEWED', tag: 'Prescriptions', summary: 'Prescription detail', handler: 'prescriptionController.getPrescription', roles: [R.admin, R.nurse, R.pharmacist, R.patient, R.doctor], owner: 'patient-or-doctor',
    record: 'requirePrescriptionAccess: Admin/Nurse/Pharmacist, the owning patient, or the prescribing doctor', success: { status: 200, keys: { data: s.ref('Prescription') } }, errors: [404] }),
  e('put', '/api/prescriptions/{id}/cancel', { auditEvent: 'PRESCRIPTION_CANCELLED', tag: 'Prescriptions', summary: 'Cancel a prescription', handler: 'prescriptionController.cancelPrescription', roles: [R.doctor, R.admin], owner: 'doctor',
    record: 'Admin or the prescribing doctor', success: { status: 200, keys: { message: s.str() } }, errors: [404, 409], notes: 'Pending prescriptions can be cancelled (repeating on an already-cancelled one is a no-op 200); Partially-Filled or Fulfilled → 409.' }),
  e('post', '/api/prescriptions/{id}/refill', { auditEvent: 'PRESCRIPTION_REFILLED', tag: 'Prescriptions', summary: 'Refill a fulfilled prescription (idempotent)', handler: 'prescriptionController.refillPrescription', roles: [R.pharmacist],
    body: s.obj({ idempotencyKey: s.uuid() }, ['idempotencyKey']), success: { status: 200, keys: { replayed: s.bool(), message: s.str(), data: s.ref('Prescription'), bill: s.ref('Bill') } }, errors: [400, 404, 409] }),
  e('post', '/api/prescriptions/{id}/dispense', { auditEvent: 'PRESCRIPTION_DISPENSED', tag: 'Prescriptions', summary: 'Dispense medicines (idempotent; decrements stock; generates a pharmacy bill)', handler: 'prescriptionController.dispensePrescription', roles: [R.pharmacist],
    body: s.obj({ idempotencyKey: s.uuid(), items: s.arr(s.obj({ medicineId: s.id(), dispensedQuantity: s.int({ minimum: 1 }) }, ['medicineId', 'dispensedQuantity']), { minItems: 1, maxItems: 50 }) }, ['idempotencyKey', 'items']),
    success: { status: 200, keys: { replayed: s.bool(), message: s.str(), data: s.ref('Prescription'), bill: s.ref('Bill') } }, errors: [400, 404, 409],
    notes: 'Over-dispensing beyond the remaining prescribed quantity → 409; insufficient stock → 409; replaying the same idempotencyKey returns the original result.' }),

  // ── Billing ────────────────────────────────────────────────────────────
  e('get', '/api/billing/patient-users', { tag: 'Billing', summary: 'Patient users for invoice forms', handler: 'billingController.getPatientUsers', roles: [R.admin, R.receptionist, R.pharmacist, R.billing], success: { status: 200, keys: { count: s.int(), enhancedUsers: s.arr(s.ref('User')) } } }),
  e('get', '/api/billing/stats', { tag: 'Billing', summary: 'Billing statistics (pharmacists: pharmacy bills only)', handler: 'billingController.getBillingStats', roles: [R.admin, R.receptionist, R.pharmacist, R.billing], query: { startDate: s.date(), endDate: s.date() }, success: { status: 200, keys: { data: s.obj({}) } } , errors: [400] }),
  e('get', '/api/billing', { tag: 'Billing', summary: 'Bill list', handler: 'billingController.getBills', roles: [R.admin, R.receptionist, R.pharmacist, R.patient, R.billing],
    query: { ...PAGINATION, patient: s.id(), paymentStatus: s.enum(['Unpaid', 'Partially-Paid', 'Paid', 'Refunded']), startDate: s.date(), endDate: s.date(), search: s.str() },
    record: 'Patient: own bills. Pharmacist: pharmacy bills only. Others: all.', visibility: 'Patient fields: identity, address, insurance only.', success: { status: 200, keys: { count: s.int(), total: s.int(), page: s.int(), pages: s.int(), bills: s.arr(s.ref('Bill')) } } , errors: [400] }),
  e('post', '/api/billing', { auditEvent: 'BILL_CREATED', tag: 'Billing', summary: 'Create a bill', handler: 'billingController.createBill', roles: [R.admin, R.receptionist, R.pharmacist, R.billing],
    body: s.obj({ patient: s.id(), items: s.arr(s.obj({ description: s.str(), category: s.enum(BILLING_CATEGORY), quantity: s.int({ minimum: 1 }), unitPrice: s.num({ minimum: 0 }) }, ['description', 'quantity', 'unitPrice']), { minItems: 1 }), discount: s.num({ minimum: 0 }), tax: s.num({ minimum: 0 }), notes: s.str(), paymentMethod: s.enum(PAYMENT_METHODS), billType: s.enum(['Consultation', 'Pharmacy', 'Test', 'Other']), relatedAppointmentId: s.id() }, ['patient', 'items']),
    success: { status: 201, keys: { message: s.str(), bill: s.ref('Bill') } }, errors: [400, 403, 404],
    notes: '`patient` is the patient USER id. Pharmacists may create Pharmacy bills only. The discount may not exceed subtotal + tax.' }),
  e('get', '/api/billing/{id}', { auditEvent: 'BILL_VIEWED', tag: 'Billing', summary: 'Bill detail', handler: 'billingController.getBill', roles: [R.admin, R.receptionist, R.billing, R.patient, R.pharmacist], owner: 'patient',
    record: 'requireBillAccess: Admin/Receptionist/Billing Staff, the owning patient, or a pharmacist for Pharmacy bills', success: { status: 200, keys: { data: s.ref('Bill') } }, errors: [404] }),
  e('delete', '/api/billing/{id}', { auditEvent: 'BILL_DELETED', tag: 'Billing', summary: 'Delete an unpaid bill', handler: 'billingController.deleteBill', roles: [R.admin], success: { status: 200, keys: { message: s.str() } }, errors: [400, 404], notes: 'Bills with recorded payments cannot be deleted (400).' }),
  e('post', '/api/billing/{id}/pay', { auditEvent: 'PATIENT_PAYMENT_RECORDED', tag: 'Billing', summary: 'Patient self-pay of the full balance (simulated; no payment gateway)', handler: 'billingController.patientPayBill', roles: [R.patient], owner: 'patient',
    record: 'Owning patient only', body: s.obj({ paymentMethod: s.enum(PAYMENT_METHODS) }, ['paymentMethod']), success: { status: 200, keys: { simulated: { const: true }, message: s.str(), bill: s.ref('Bill') } }, errors: [400, 404, 409] }),
  e('post', '/api/billing/{id}/payment', { auditEvent: 'PAYMENT_RECORDED', tag: 'Billing', summary: 'Record a (partial) payment', handler: 'billingController.recordPayment', roles: [R.admin, R.receptionist, R.billing],
    body: s.obj({ amount: s.num({ exclusiveMinimum: 0 }), paymentMethod: s.enum(PAYMENT_METHODS), transactionId: s.str(), notes: s.str() }, ['amount', 'paymentMethod']), success: { status: 200, keys: { message: s.str(), bill: s.ref('Bill') } }, errors: [400, 404, 409], notes: 'Payment above the balance → 409.' }),
  e('post', '/api/billing/{id}/insurance', { auditEvent: 'INSURANCE_CLAIM_SUBMITTED', tag: 'Billing', summary: 'Submit an insurance claim', handler: 'billingController.processInsuranceClaim', roles: [R.admin, R.receptionist, R.billing],
    body: s.obj({ claimNumber: s.str(), provider: s.str(), amountClaimed: s.num({ exclusiveMinimum: 0 }) }, ['claimNumber', 'provider', 'amountClaimed']), success: { status: 200, keys: { message: s.str(), bill: s.ref('Bill') } }, errors: [400, 404, 409], notes: 'One active claim per bill (409); claim may not exceed the balance (400).' }),
  e('put', '/api/billing/{id}/insurance', { auditEvent: 'INSURANCE_CLAIM_PROCESSED', tag: 'Billing', summary: 'Process an insurance claim', handler: 'billingController.updateInsuranceClaim', roles: [R.admin],
    body: s.obj({ status: s.enum(['Pending', 'Approved', 'Rejected', 'Partially-Approved']), approvedAmount: s.num(), rejectionReason: s.str() }, ['status']), success: { status: 200, keys: { message: s.str(), bill: s.ref('Bill') } }, errors: [400, 404, 409] }),

  // ── Staff (Admin only) ─────────────────────────────────────────────────
  e('get', '/api/staff/available-users', { tag: 'Staff', summary: 'Users eligible for a staff profile', handler: 'staffController.getAvailableStaffUsers', roles: [R.admin], success: { status: 200, keys: { data: s.arr(s.ref('User')) } } }),
  e('get', '/api/staff/stats', { tag: 'Staff', summary: 'Staff statistics', handler: 'staffController.getStaffStats', roles: [R.admin], success: { status: 200, keys: { data: s.obj({}) } } }),
  e('get', '/api/staff/department/{department}', { tag: 'Staff', summary: 'Staff in a department', handler: 'staffController.getStaffByDepartment', roles: [R.admin], success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Staff')) } } }),
  e('get', '/api/staff', { tag: 'Staff', summary: 'Active staff', handler: 'staffController.getStaff', roles: [R.admin], query: { department: s.str(), designation: s.str(), employmentType: s.str(), shift: s.str() }, success: { status: 200, keys: { count: s.int(), data: s.arr(s.ref('Staff')) } } , errors: [400] }),
  e('post', '/api/staff', { auditEvent: 'STAFF_CREATED', tag: 'Staff', summary: 'Create a staff member', handler: 'staffController.createStaff', roles: [R.admin],
    body: s.obj({ userId: s.id(), name: s.str(), email: s.str({ format: 'email' }), phone: s.str(), gender: s.enum(GENDER), subRole: s.enum(STAFF_SUBROLES), designation: s.str(), department: s.str(), qualification: s.str(), joiningDate: s.date(), employmentType: s.enum(['Full-Time', 'Part-Time', 'Contract', 'Intern']), shift: s.enum(['Morning', 'Evening', 'Night', 'Rotational']), salary: s.obj({ basic: s.num({ minimum: 0 }), allowances: s.num({ minimum: 0 }) }) }, ['department', 'subRole']),
    success: { status: 201, keys: { message: s.str(), data: s.ref('Staff') } }, errors: [400, 409] }),
  e('get', '/api/staff/{id}', { tag: 'Staff', summary: 'Staff member', handler: 'staffController.getStaffMember', roles: [R.admin], success: { status: 200, keys: { data: s.ref('Staff') } }, errors: [404] }),
  e('put', '/api/staff/{id}', { auditEvent: 'STAFF_UPDATED', tag: 'Staff', summary: 'Update a staff member', handler: 'staffController.updateStaff', roles: [R.admin],
    body: s.obj({ designation: s.str(), department: s.str(), qualification: s.str(), joiningDate: s.date(), employmentType: s.enum(['Full-Time', 'Part-Time', 'Contract', 'Intern']), shift: s.enum(['Morning', 'Evening', 'Night', 'Rotational']), salary: s.obj({}), skills: s.arr(s.str()), supervisor: s.id() }),
    success: { status: 200, keys: { data: s.ref('Staff') } }, errors: [400, 404] }),
  e('delete', '/api/staff/{id}', { auditEvent: 'STAFF_DEACTIVATED', tag: 'Staff', summary: 'Deactivate a staff member and their account (soft)', handler: 'staffController.deleteStaff', roles: [R.admin], success: { status: 200, keys: { message: s.str() } }, errors: [404] }),
  e('put', '/api/staff/{id}/performance', { auditEvent: 'STAFF_PERFORMANCE_UPDATED', tag: 'Staff', summary: 'Record a performance rating', handler: 'staffController.updatePerformance', roles: [R.admin], body: s.obj({ rating: s.num({ minimum: 0, maximum: 5 }), notes: s.str() }, ['rating']), success: { status: 200, keys: { data: s.ref('Staff') } }, errors: [400, 404] }),

  // ── Reports (Admin only) ───────────────────────────────────────────────
  e('get', '/api/reports/patient-visits', { tag: 'Reports', summary: 'Patient visit report', handler: 'reportController.getPatientVisitsReport', roles: [R.admin], query: { startDate: s.date(), endDate: s.date(), doctorId: s.id(), patientId: s.id() }, success: { status: 200, keys: { stats: s.obj({}), count: s.int(), data: s.arr(s.obj({})) } } , errors: [400] }),
  e('get', '/api/reports/doctor-performance', { tag: 'Reports', summary: 'Doctor performance report', handler: 'reportController.getDoctorPerformanceReport', roles: [R.admin], query: { startDate: s.date(), endDate: s.date(), doctorId: s.id() }, success: { status: 200, keys: { count: s.int(), data: s.arr(s.obj({})) } } , errors: [400] }),
  e('get', '/api/reports/ward-usage', { tag: 'Reports', summary: 'Ward usage report', handler: 'reportController.getWardUsageReport', roles: [R.admin], query: { wardType: s.enum(WARD_TYPE), floor: s.int() }, success: { status: 200, keys: { overall: s.obj({}), count: s.int(), data: s.arr(s.obj({})) } } , errors: [400] }),
  e('get', '/api/reports/revenue', { tag: 'Reports', summary: 'Revenue report', handler: 'reportController.getRevenueReport', roles: [R.admin], query: { startDate: s.date(), endDate: s.date(), category: s.str(), paymentStatus: s.str() }, success: { status: 200, keys: { stats: s.obj({}), count: s.int(), data: s.arr(s.obj({})) } } , errors: [400] }),
  e('get', '/api/reports/dashboard', { tag: 'Reports', summary: 'Report dashboard statistics', handler: 'reportController.getDashboardStats', roles: [R.admin], success: { status: 200, keys: { stats: s.obj({}), recentActivities: s.any() } } }),

  // ── Audit (Admin only) ─────────────────────────────────────────────────
  e('get', '/api/audit-events', { tag: 'Audit', summary: 'Query the access/activity audit trail', handler: 'auditController.getAuditEvents', roles: [R.admin], auditEvent: 'AUDIT_LOG_VIEWED',
    query: { ...PAGINATION, action: s.str({ pattern: '^[A-Z_]+$' }), actorId: s.str(), patientId: s.str(), resourceType: s.str(), resourceId: s.str(), outcome: s.enum(['success', 'denied', 'failure']), from: s.dateTime(), to: s.dateTime() },
    success: { status: 200, keys: { count: s.int(), total: s.int(), page: s.int(), pages: s.int(), data: s.arr(s.ref('AuditEvent')) } }, errors: [400],
    notes: 'Newest first; default page size 50, max 100. Events contain identifiers, outcome, and allow-listed metadata only — never clinical text or credentials.' }),

  // ── AI (decision support only) ─────────────────────────────────────────
  e('get', '/api/ai/reliability', { ...AI_COMMON, summary: 'AI audit/reliability summary', handler: 'aiRoutes.js inline (getAiAuditSummary)', roles: [R.admin], audit: null, query: { hours: s.int({ minimum: 1, maximum: 720 }) }, success: { status: 200, keys: { data: s.obj({}) } }, errors: [503, 400] }),
  e('post', '/api/ai/chat', { ...AI_COMMON, summary: 'Patient assistant chat (guidance only)', handler: 'aiRoutes.js inline (runPatientAssistant)', roles: ALL_ROLES, state: 'read',
    body: s.obj({ message: s.str({ minLength: 1, maxLength: 2000 }), history: s.arr(s.obj({ role: s.enum(['user', 'assistant']), content: s.str({ maxLength: 2000 }) }), { maxItems: 10 }) }, ['message']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500], visibility: AI_VIS }),
  e('post', '/api/ai/symptom-analysis', { ...AI_COMMON, summary: 'Symptom triage guidance (no diagnosis; emergency escalation enforced)', handler: 'aiRoutes.js inline (runSymptomAnalysis)', roles: [R.admin, R.doctor, R.patient, R.nurse, R.receptionist], state: 'read',
    body: s.obj({ symptoms: s.str({ minLength: 1, maxLength: 2000 }), age: s.int({ minimum: 0, maximum: 120 }), gender: s.enum(GENDER) }, ['symptoms']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500], visibility: AI_VIS }),
  e('post', '/api/ai/report-analysis', { ...AI_COMMON, summary: 'Lab report explanation (ranges parsed deterministically)', handler: 'aiRoutes.js inline (runReportAnalysis)', roles: [R.admin, R.doctor, R.patient, R.lab, R.radiology], state: 'read',
    body: s.obj({ reportText: s.str({ minLength: 1, maxLength: 12000 }), reportType: s.str({ maxLength: 100 }) }, ['reportText']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500], visibility: AI_VIS }),
  e('post', '/api/ai/health-risk', { ...AI_COMMON, summary: 'Rules-based health-risk score (not a predictive model)', handler: 'aiRoutes.js inline (runHealthRisk)', roles: [R.admin, R.doctor, R.patient], state: 'read',
    body: s.obj({ age: s.int({ minimum: 0, maximum: 120 }), gender: s.enum(GENDER), chronicConditions: s.arr(s.str({ maxLength: 200 }), { maxItems: 20 }), acuteSymptoms: s.arr(s.str({ maxLength: 200 }), { maxItems: 20 }) }, ['age']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500], visibility: AI_VIS }),
  e('post', '/api/ai/bed-allocation', { ...AI_COMMON, summary: 'Bed placement advisory from live bed records', handler: 'aiRoutes.js inline (runBedAllocation)', roles: [R.admin, R.doctor, R.nurse, R.ward], state: 'read',
    body: s.obj({ condition: s.str({ minLength: 1, maxLength: 1000 }), urgency: s.enum(URGENCY), age: s.int({ minimum: 0, maximum: 120 }), gender: s.enum(GENDER) }, ['condition']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500] }),
  e('post', '/api/ai/appointment-optimizer', { ...AI_COMMON, summary: 'Doctor recommendation from live doctor records', handler: 'aiRoutes.js inline (runAppointmentOptimizer)', roles: [R.admin, R.doctor, R.patient, R.receptionist], state: 'read',
    body: s.obj({ symptoms: s.str({ minLength: 1, maxLength: 2000 }), department: s.str({ maxLength: 100 }) }, ['symptoms']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500], visibility: AI_VIS }),
  e('get', '/api/ai/patient-summary/{patientId}', { auditEvent: 'AI_PATIENT_SUMMARY_VIEWED', ...AI_COMMON, summary: 'Record-grounded patient summary (no LLM call)', handler: 'aiRoutes.js inline (runPatientSummary)', roles: [R.admin, R.doctor, R.nurse], owner: 'patient', careScope: true,
    success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [404, 429, 500], visibility: AI_VIS }),
  e('post', '/api/ai/symptom-to-appointment', { ...AI_COMMON, summary: 'Symptom triage chained to doctor recommendation', handler: 'aiRoutes.js inline', roles: [R.admin, R.doctor, R.patient, R.receptionist], state: 'read',
    body: s.obj({ symptoms: s.str({ minLength: 1, maxLength: 2000 }), age: s.int({ minimum: 0, maximum: 120 }), gender: s.enum(GENDER) }, ['symptoms']), success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [400, 429, 500], visibility: AI_VIS }),
  e('get', '/api/ai/admin-insights', { ...AI_COMMON, summary: 'Operational insights from live records', handler: 'aiRoutes.js inline (runAdminInsights)', roles: [R.admin], success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [429, 500] }),
  e('get', '/api/ai/pharmacy-alerts', { ...AI_COMMON, summary: 'Stock/expiry alerts from live records', handler: 'aiRoutes.js inline (runPharmacyAlerts)', roles: [R.admin, R.pharmacist], success: { status: 200, keys: { data: s.ref('AiResult') } }, errors: [429, 500] }),
];

module.exports = { endpoints, ROLES, ALL_ROLES, ANY, schemaHelpers: s };

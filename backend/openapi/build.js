'use strict';

const { endpoints, ANY, schemaHelpers: s } = require('./catalog');

const STATUS_TEXT = {
  200: 'OK', 201: 'Created', 400: 'Validation or business-rule error', 401: 'Missing, malformed, expired, or inactive-account token',
  403: 'Authenticated but not permitted (role, ownership, care scope, or modality)', 404: 'Record not found', 409: 'Conflict (state, duplicate, or concurrency)',
  429: 'Rate limit exceeded', 500: 'Internal error (generic message and requestId only)', 503: 'Dependency unavailable',
};

const components = {
  securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT from /api/auth/login (default lifetime 12h), sent as Authorization: Bearer <token>. Every request re-checks that the account is active and that the token version is current (logout, password change, and reset revoke older tokens).' },
  },
  schemas: {
    Error: s.obj({ success: { const: false }, message: s.str(), requestId: s.str({ description: 'Present on 5xx responses for log correlation' }), code: s.str() }, ['message']),
    ValidationError: s.obj({ errors: s.arr(s.obj({ type: s.str(), msg: s.str(), path: s.str(), location: s.str() }, ['msg'])) }, ['errors']),
    Address: s.obj({ street: s.str(), city: s.str(), state: s.str(), zipCode: s.str(), country: s.str() }),
    User: s.obj({ id: s.str(), _id: s.str(), name: s.str(), email: s.str(), phone: s.str(), role: s.str(), subRole: { type: ['string', 'null'] }, gender: { type: ['string', 'null'] }, dateOfBirth: { type: ['string', 'null'] }, avatar: s.str(), isActive: s.bool(), address: s.ref('Address') }),
    PatientIdentity: s.obj({ id: s.str(), _id: s.str(), patientId: s.str(), userId: s.ref('User') }),
    PatientSummary: s.obj({ id: s.str(), _id: s.str(), patientId: s.str(), bloodGroup: { type: ['string', 'null'] }, allergies: s.arr(s.str()), emergencyContact: s.obj({}), insuranceInfo: s.obj({}), userId: s.ref('User') }),
    Patient: s.obj({ id: s.str(), _id: s.str(), patientId: s.str(), bloodGroup: { type: ['string', 'null'] }, allergies: s.arr(s.str()), medicalHistory: s.arr(s.obj({})), labReports: s.arr(s.ref('LabReport')), currentMedications: s.arr(s.obj({})), userId: s.ref('User') }),
    LabReport: s.obj({ id: s.str(), testName: s.str(), testType: { type: ['string', 'null'] }, status: s.str(), result: { type: ['string', 'null'] }, attachmentOriginalName: { type: ['string', 'null'] } }),
    Doctor: s.obj({ id: s.str(), _id: s.str(), specialization: s.str(), department: s.str(), qualification: s.str(), experience: s.int(), consultationFee: s.num(), isAvailable: s.bool(), userId: s.ref('User') }),
    Appointment: s.obj({ id: s.str(), _id: s.str(), appointmentId: s.str(), appointmentDate: s.str(), timeSlot: s.obj({ startTime: s.str(), endTime: s.str() }), type: s.str(), status: s.str(), priority: s.str(), patient: s.ref('PatientIdentity'), doctor: s.obj({}) }),
    Prescription: s.obj({ id: s.str(), _id: s.str(), prescriptionId: s.str(), status: s.str(), medicines: s.arr(s.obj({})), patient: s.obj({}), doctor: s.obj({}) }),
    Bill: s.obj({ id: s.str(), _id: s.str(), billNumber: { type: ['string', 'null'] }, billType: s.str(), subtotal: s.num(), discount: s.num(), tax: s.num(), totalAmount: s.num(), amountPaid: s.num(), balance: s.num(), paymentStatus: s.str(), items: s.arr(s.obj({})), payments: s.arr(s.obj({})), patient: s.obj({}) }),
    Medicine: s.obj({ id: s.str(), _id: s.str(), name: s.str(), genericName: s.str(), category: s.str(), unitPrice: s.num(), stockQuantity: s.int(), expiryDate: s.str(), isActive: s.bool(), stockStatus: s.str(), expiryStatus: s.str() }),
    Ward: s.obj({ id: s.str(), _id: s.str(), wardNumber: s.str(), wardName: s.str(), wardType: s.str(), totalBeds: s.int(), availableBeds: s.int(), dailyRate: s.num(), beds: s.arr(s.obj({ id: s.str(), bedNumber: s.str(), isOccupied: s.bool(), patient: s.ref('PatientIdentity') })) }),
    Staff: s.obj({ id: s.str(), _id: s.str(), employeeId: s.str(), designation: s.str(), department: s.str(), isActive: s.bool(), userId: s.ref('User') }),
    ClinicalNote: s.obj({ id: s.str(), title: s.str(), status: s.enum(['Draft', 'Reviewed', 'Amended']), source: s.str(), currentVersion: s.int(), versions: s.arr(s.obj({ version: s.int(), content: s.str(), isAiGenerated: s.bool(), clinicallyConfirmed: s.bool() })) }),
    AuditEvent: s.obj({ id: s.str(), createdAt: s.dateTime(), actorId: { type: ['string', 'null'] }, actorRole: { type: ['string', 'null'] }, action: s.str(), outcome: s.enum(['success', 'denied', 'failure']), resourceType: { type: ['string', 'null'] }, resourceId: { type: ['string', 'null'] }, patientId: { type: ['string', 'null'] }, requestId: { type: ['string', 'null'] }, metadata: { type: ['object', 'null'] }, actor: { type: ['object', 'null'] } }),
    AiResult: s.obj({ sourceType: s.str(), sourceLabel: s.str(), requiresHumanReview: s.bool(), limitations: s.arr(s.str()), generatedAt: s.str() }),
  },
};

const pathParams = (path) => [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

const errorResponse = (code) => (code === 400
  ? { description: STATUS_TEXT[400], content: { 'application/json': { schema: { oneOf: [s.ref('Error'), s.ref('ValidationError')] } } } }
  : { description: STATUS_TEXT[code], content: { 'application/json': { schema: s.ref('Error') } } });

function successResponse(success) {
  if (success.binary) {
    return { description: 'File stream', content: Object.fromEntries(success.binary.map((type) => [type, { schema: { type: 'string', contentEncoding: 'binary' } }])) };
  }
  const schema = success.raw || s.obj({ success: { const: true }, ...success.keys }, ['success']);
  return { description: STATUS_TEXT[success.status] || 'Success', content: { 'application/json': { schema } } };
}

function operation(ep) {
  const protectedRoute = ep.auth === 'jwt';
  const op = {
    operationId: `${ep.method}${ep.path.replace(/[{}]/g, '').replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))}`,
    tags: [ep.tag],
    summary: ep.summary,
    ...(ep.notes ? { description: ep.notes } : {}),
    security: protectedRoute ? [{ bearerAuth: [] }] : [],
    'x-handler': ep.handler,
    'x-roles': protectedRoute ? (ep.roles === ANY ? [ANY] : ep.roles) : ['public'],
    'x-owner-access': ep.owner || null,
    'x-care-scope': Boolean(ep.careScope),
    'x-record-access': ep.record || null,
    'x-state-changing': ep.state === 'write',
    'x-audit': [ep.audit, ep.auditEvent && `AuditEvent ${ep.auditEvent} (success; 403 recorded as denied)`, ep.auditNote && `AuditEvent ${ep.auditNote}`].filter(Boolean).join('; ') || null,
    'x-patient-visibility': ep.visibility || null,
    'x-rate-limit': ep.limiter,
    parameters: [
      ...pathParams(ep.path).map((name) => ({ name, in: 'path', required: true, schema: s.str() })),
      ...Object.entries(ep.query || {}).map(([name, schema]) => ({ name, in: 'query', required: (ep.requiredQuery || []).includes(name), schema })),
    ],
    responses: {},
  };
  if (ep.body) op.requestBody = { required: Boolean(ep.body.required && ep.body.required.length), content: { 'application/json': { schema: ep.body } } };
  if (ep.upload) {
    op.requestBody = {
      required: true,
      content: { 'multipart/form-data': { schema: s.obj({ [ep.upload.field]: { type: 'string', contentEncoding: 'binary' }, ...(ep.upload.extraFields || {}) }, [ep.upload.field]) } },
    };
    op['x-upload'] = { field: ep.upload.field, extensions: ep.upload.extensions, mimeTypes: ep.upload.mimeTypes, maxBytes: ep.upload.maxBytes, signatureChecked: ep.upload.signatureChecked, storage: ep.upload.storage };
  }
  op.responses[String(ep.success.status)] = successResponse(ep.success);
  const codes = new Set(ep.errors);
  if (protectedRoute) { codes.add(401); if (ep.roles !== ANY || ep.owner) codes.add(403); }
  if (ep.body || ep.upload || ep.requiredQuery) codes.add(400);
  if (ep.limiter === 'auth' || ep.limiter === 'ai' || ep.limiter === 'api') codes.add(429);
  if (ep.limiter !== 'none') codes.add(500);
  [...codes].sort().forEach((code) => { op.responses[String(code)] = errorResponse(code); });
  return op;
}

function buildSpec() {
  const paths = {};
  for (const ep of endpoints) {
    paths[ep.path] = paths[ep.path] || {};
    if (paths[ep.path][ep.method]) throw new Error(`Duplicate catalog entry: ${ep.method.toUpperCase()} ${ep.path}`);
    paths[ep.path][ep.method] = operation(ep);
  }
  const TAG_DESCRIPTIONS = {
    System: 'Banner and health check (public).',
    Auth: 'Registration, login, password reset, and own-profile operations.',
    Dashboards: 'Role dashboards; each is scoped to the caller.',
    Doctors: 'Doctor directory and doctor lifecycle.',
    Patients: 'Patient registration, role-projected lists, and patient detail.',
    'Clinical records': 'Medical history, lab/radiology reports, and attachments. Staff-only writes with care/modality scope.',
    'Clinical notes': 'AI/record-derived drafts and clinician review with explicit confirmation and versioning.',
    Appointments: 'Booking, scheduling state machine, cancellation, and rescheduling.',
    Wards: 'Wards, beds, admissions, and discharges.',
    Medicines: 'Pharmacy inventory.',
    Prescriptions: 'Prescribing, dispensing, refills.',
    Billing: 'Bills, payments (no payment gateway), and insurance claims.',
    Staff: 'Staff management (Admin only).',
    Reports: 'Operational analytics (Admin only).',
    Audit: 'Access and activity audit trail (Admin only).',
    AI: 'Decision-support tools. Not clinically validated; outputs require human review.',
  };
  const tags = [...new Set(endpoints.map((ep) => ep.tag))].map((name) => ({ name, description: TAG_DESCRIPTIONS[name] || name }));
  return {
    openapi: '3.1.0',
    info: {
      title: 'MediLink HMS API',
      version: '1.0.0-phase1b',
      description: [
        'Contract for the MediLink hospital management API, generated from backend/openapi/catalog.js.',
        'MediLink AI features are decision support only and are not clinically validated for diagnosis or treatment.',
        'Authorization metadata: x-roles (role keys allowed by the route), x-owner-access (record owners who pass record-level checks),',
        'x-care-scope (doctors need a care relationship; nurses need an active encounter), x-record-access, x-patient-visibility, x-audit.',
        'All JSON responses are stripped of credential fields (password, reset tokens) by the server.',
      ].join(' '),
    },
    servers: [{ url: '/', description: 'Same origin as the deployed API' }],
    tags,
    paths,
    components,
  };
}

module.exports = { buildSpec, STATUS_TEXT };

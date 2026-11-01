'use strict';

// Spec-driven verification matrix for all 120 endpoints (synthetic data only).
//
// For every protected endpoint in openapi/catalog.js:
//   - no token, malformed token, wrong-secret token, expired token, and an
//     inactive account's token → 401;
//   - every principal the contract does NOT allow → 403 (no mutation happens,
//     because authorization runs before any handler);
//   - for GET endpoints, every allowed principal → 2xx with no credential
//     fields anywhere in the body.
// Allowed-principal behavior for state-changing endpoints is verified in the
// per-group contract suites, where mutations are controlled.

const { createHarness } = require('./support/harness');
process.env.AI_REQUESTS_PER_MINUTE = '100000';
process.env.AI_MAX_CONCURRENT_REQUESTS = '100';

const test = require('node:test');
const assert = require('node:assert/strict');
const { endpoints, ANY } = require('../openapi/catalog');

const h = createHarness('matrix');
const P = {};
const F = {};

const PRINCIPAL_ROLE = {
  owner: 'patient', otherPatient: 'patient', doctor: 'doctor', unrelatedDoctor: 'doctor', nurse: 'nurse',
  lab: 'lab-technician', radiology: 'radiology-technician', pharmacist: 'pharmacist', billing: 'billing-staff',
  receptionist: 'receptionist', wardManager: 'ward-manager', admin: 'admin',
};

// Contract interpretation shared with the OpenAPI x-* metadata.
function expectedAllowed(ep, who) {
  const role = PRINCIPAL_ROLE[who];
  const roles = ep.roles;
  if (roles === ANY) return true;
  const owner = ep.owner || '';
  if (role === 'patient') return owner.includes('patient') ? who === 'owner' : roles.includes('patient');
  if (!roles.includes(role)) return false;
  if ((ep.matrixDeny || []).includes(role)) return false;
  if (role === 'doctor' && (ep.careScope || owner.includes('doctor'))) return who === 'doctor';
  return true;
}

function resolvePath(ep) {
  let p = ep.path;
  const byPrefix = [
    ['/api/patients/diagnostic-workspace/{id}', { id: F.patient }],
    ['/api/patients/', { id: F.patient, historyId: F.history, reportId: F.report, noteId: F.note }],
    ['/api/doctors/', { id: F.doctor }],
    ['/api/appointments/availability/', { doctorId: F.doctor }],
    ['/api/appointments/', { id: F.appointment }],
    ['/api/wards/', { id: F.ward }],
    ['/api/medicines/', { id: F.medicine }],
    ['/api/prescriptions/', { id: F.prescription }],
    ['/api/billing/', { id: F.bill }],
    ['/api/staff/department/', { department: 'Integration Department' }],
    ['/api/staff/', { id: F.staff }],
    ['/api/ai/patient-summary/', { patientId: F.patient }],
  ];
  const match = byPrefix.find(([prefix]) => p.startsWith(prefix.replace(/\{.*$/, '')));
  if (match) for (const [name, value] of Object.entries(match[1])) p = p.replace(`{${name}}`, value);
  if (/\{/.test(p)) throw new Error(`unresolved path parameter in ${ep.path}`);
  if (ep.requiredQuery?.includes('date')) p += `?date=${F.availabilityDate}`;
  return p;
}

test.before(async () => {
  await h.start();
  P.owner = await h.createPatient('owner');
  P.otherPatient = await h.createPatient('other-patient');
  P.doctor = await h.createDoctor('doctor');
  P.unrelatedDoctor = await h.createDoctor('unrelated-doctor', { department: 'Dermatology', specialization: 'Dermatology' });
  P.nurse = await h.createUser('nurse', 'Staff', 'Nurse');
  P.lab = await h.createUser('lab', 'Staff', 'LabTechnician');
  P.radiology = await h.createUser('radiology', 'Staff', 'RadiologyTechnician');
  P.pharmacist = await h.createUser('pharmacist', 'Staff', 'Pharmacist');
  P.billing = await h.createUser('billing', 'Staff', 'BillingStaff');
  P.receptionist = await h.createUser('receptionist', 'Staff', 'Receptionist');
  P.wardManager = await h.createUser('ward-manager', 'Staff', 'WardManager');
  P.admin = await h.createUser('admin', 'Admin');
  P.inactive = await h.createUser('inactive-admin', 'Admin', null, { isActive: false });

  const { prisma } = h;
  const day = h.futureDay(21);
  F.availabilityDate = day.text;
  await prisma.doctor.update({ where: { id: P.doctor.profile.id }, data: { availability: [{ day: day.weekday, slots: [{ startTime: '09:00', endTime: '12:00', isAvailable: true }] }] } });
  F.patient = P.owner.profile.id;
  F.doctor = P.doctor.profile.id;
  F.appointment = (await h.createAppointment(F.patient, F.doctor)).id;
  F.history = (await prisma.medicalHistory.create({ data: { patientId: F.patient, condition: 'Synthetic condition', diagnosedDate: new Date('2020-01-01'), status: 'Chronic' } })).id;
  F.report = (await prisma.labReport.create({ data: { patientId: F.patient, testName: 'Synthetic CBC', testType: 'Blood Test', status: 'Completed' } })).id;
  const uploaded = await h.upload(`/api/patients/${F.patient}/lab-report/${F.report}/attachment`, { token: P.doctor.token });
  assert.equal(uploaded.status, 200, 'fixture attachment upload');
  F.note = (await prisma.clinicalNote.create({ data: {
    patientId: F.patient, title: 'Synthetic draft', status: 'Draft', source: 'ai', createdById: P.doctor.user.id,
    versions: { create: { version: 1, content: 'Synthetic draft content for review.', isAiGenerated: true, createdById: P.doctor.user.id } },
  } })).id;
  const medicine = await h.createMedicine();
  F.medicine = medicine.id;
  F.prescription = (await prisma.prescription.create({ data: {
    prescriptionId: `IT-RX-${h.tag()}`, patientId: F.patient, doctorId: F.doctor,
    medicines: { create: [{ medicineId: medicine.id, dosage: '1 tablet', frequency: 'Daily', duration: '5 days', quantity: 5 }] },
  } })).id;
  F.bill = (await prisma.billing.create({ data: { patientId: F.patient, billType: 'Pharmacy', subtotal: 50, totalAmount: 50, balance: 50, items: { create: [{ description: 'Synthetic item', unitPrice: 50, amount: 50 }] } } })).id;
  F.ward = (await h.createWard()).id;
  F.staff = (await prisma.staff.create({ data: { userId: P.receptionist.user.id, designation: 'Receptionist', department: 'Integration Department', joiningDate: new Date('2024-01-01') } })).id;
});

test.after(async () => { await h.stop(); });

const protectedEndpoints = endpoints.filter((ep) => ep.auth === 'jwt');

test('matrix covers every catalogued endpoint', () => {
  assert.equal(endpoints.length, 121);
  assert.equal(protectedEndpoints.length, 115);
});

test('public endpoints are reachable without a token', async () => {
  assert.equal((await h.request('/')).status, 200);
  assert.equal((await h.request('/health')).status, 200);
});

test('every protected endpoint rejects missing, malformed, wrong-secret, expired, and inactive-account tokens with 401', async () => {
  const failures = [];
  for (const ep of protectedEndpoints) {
    const url = resolvePath(ep);
    const method = ep.method.toUpperCase();
    const cases = {
      missing: undefined,
      malformed: h.tokens.malformed,
      wrongSecret: h.tokens.wrongSecret(P.admin.user),
      expired: h.tokens.expired(P.admin.user),
      inactive: P.inactive.token,
    };
    for (const [name, token] of Object.entries(cases)) {
      const { status } = await h.request(url, { token, method });
      if (status !== 401) failures.push(`${method} ${ep.path} [${name}] → ${status}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('every protected endpoint enforces its role, ownership, care-scope, and modality contract', async () => {
  const failures = [];
  let positiveChecks = 0;
  let denialChecks = 0;
  for (const ep of protectedEndpoints) {
    const url = resolvePath(ep);
    const method = ep.method.toUpperCase();
    for (const who of Object.keys(PRINCIPAL_ROLE)) {
      const allowed = expectedAllowed(ep, who);
      if (allowed && method !== 'GET') continue; // verified in the group suites
      const res = await h.request(url, { token: P[who].token, method });
      if (allowed) {
        positiveChecks += 1;
        if (res.status < 200 || res.status >= 300) failures.push(`${method} ${ep.path} as ${who}: expected 2xx, got ${res.status}`);
        else if (res.json && h.findSensitiveFieldPaths(res.json).length) failures.push(`${method} ${ep.path} as ${who}: sensitive fields ${h.findSensitiveFieldPaths(res.json).join(',')}`);
      } else {
        denialChecks += 1;
        if (res.status !== 403) failures.push(`${method} ${ep.path} as ${who}: expected 403, got ${res.status}`);
      }
    }
  }
  assert.deepEqual(failures, []);
  assert.ok(positiveChecks > 150, `positive checks: ${positiveChecks}`);
  assert.ok(denialChecks > 500, `denial checks: ${denialChecks}`);
});

// Builds a minimal schema-valid example from a catalog JSON schema so that a
// request passes validation and reaches the record lookup.
function exampleFor(schema) {
  if (!schema || typeof schema !== 'object') return undefined;
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum[0];
  if (schema.$ref) return {};
  switch (schema.type) {
    case 'string':
      if (schema.format === 'uuid') return crypto.randomUUID();
      if (schema.format === 'date') return h.futureDay(30).text;
      if (schema.format === 'date-time') return new Date(Date.now() + 30 * 86400000).toISOString();
      if (schema.format === 'email') return `integration-ex-${h.tag()}@medilink.invalid`;
      if (schema.pattern) return '09:00';
      return 'Synthetic example value'.slice(0, schema.maxLength || 64).padEnd(schema.minLength || 0, 'x');
    case 'integer': return Math.max(schema.minimum ?? 1, 1);
    case 'number': return Math.max(schema.minimum ?? 1, schema.exclusiveMinimum !== undefined ? schema.exclusiveMinimum + 1 : 1);
    case 'boolean': return true;
    case 'array': return schema.minItems ? [exampleFor(schema.items)] : [];
    case 'object': return Object.fromEntries((schema.required || []).map((key) => [key, exampleFor(schema.properties[key])]));
    default: return undefined;
  }
}

const crypto = require('crypto');
const ID_PARAMS = ['id', 'doctorId', 'patientId', 'historyId', 'reportId', 'noteId'];

test('every endpoint with a record ID returns 404 for an unknown record (as a permitted principal, with a valid body)', async () => {
  const failures = [];
  let checked = 0;
  for (const ep of protectedEndpoints) {
    const hasIdParam = [...ep.path.matchAll(/\{(\w+)\}/g)].some((m) => ID_PARAMS.includes(m[1]));
    if (!hasIdParam || ep.upload) continue; // upload 404s are covered in contract.patients
    const who = ['admin', 'doctor', 'owner', 'nurse', 'pharmacist', 'receptionist', 'lab', 'billing', 'wardManager', 'radiology']
      .find((candidate) => expectedAllowed(ep, candidate));
    if (!who) continue;
    // Replace the innermost record ID with a random UUID; outer records stay real
    // so nested lookups (e.g. /patients/{id}/medical-history/{historyId}) reach it.
    const [pathPart, queryPart] = resolvePath(ep).split('?');
    const segments = pathPart.split('/');
    const idIndexes = segments.map((seg, i) => (/^[0-9a-f-]{36}$/.test(seg) ? i : -1)).filter((i) => i >= 0);
    segments[idIndexes[idIndexes.length - 1]] = crypto.randomUUID();
    const url = segments.join('/') + (queryPart ? `?${queryPart}` : '');

    const res = await h.request(url, { token: P[who].token, method: ep.method.toUpperCase(), body: ep.body ? exampleFor(ep.body) : undefined });
    checked += 1;
    if (res.status !== 404) failures.push(`${ep.method.toUpperCase()} ${ep.path} as ${who}: expected 404, got ${res.status}`);
  }
  assert.deepEqual(failures, []);
  assert.equal(checked, 54, 'all record-ID endpoints (excluding the upload route) were probed');
});

test('denied requests did not mutate the fixtures', async () => {
  const { prisma } = h;
  assert.ok(await prisma.patient.findUnique({ where: { id: F.patient } }));
  assert.equal((await prisma.patient.findUnique({ where: { id: F.patient } })).archivedAt, null);
  assert.equal((await prisma.appointment.findUnique({ where: { id: F.appointment } })).status, 'Scheduled');
  assert.equal((await prisma.prescription.findUnique({ where: { id: F.prescription } })).status, 'Pending');
  assert.equal((await prisma.billing.findUnique({ where: { id: F.bill } })).amountPaid, 0);
  assert.equal((await prisma.medicine.findUnique({ where: { id: F.medicine } })).stockQuantity, 100);
  assert.equal((await prisma.ward.findUnique({ where: { id: F.ward } })).isActive, true);
  assert.equal((await prisma.medicalHistory.findUnique({ where: { id: F.history } })).isVoided, false);
  assert.equal((await prisma.clinicalNote.findUnique({ where: { id: F.note } })).status, 'Draft');
  assert.equal((await prisma.staff.findUnique({ where: { id: F.staff } })).isActive, true);
});

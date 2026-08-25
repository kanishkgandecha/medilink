const test = require('node:test');
const assert = require('node:assert/strict');
const { authorize } = require('../middleware/auth');

const runAuthorize = (user, ...allowed) => {
  let nextCalled = false;
  let statusCode = 200;
  let body;
  const req = { user };
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return this; },
  };
  authorize(...allowed)(req, res, () => { nextCalled = true; });
  return { nextCalled, statusCode, body };
};

test('authorize treats compact Prisma sub-role values as canonical labels', () => {
  assert.equal(runAuthorize({ role: 'Staff', subRole: 'LabTechnician' }, 'Lab Technician').nextCalled, true);
  assert.equal(runAuthorize({ role: 'Staff', subRole: 'RadiologyTechnician' }, 'Radiology Technician').nextCalled, true);
  assert.equal(runAuthorize({ role: 'Staff', subRole: 'BillingStaff' }, 'Billing Staff').nextCalled, true);
});

test('authorize rejects a staff sub-role outside the route policy', () => {
  const result = runAuthorize({ role: 'Staff', subRole: 'BillingStaff' }, 'Admin', 'Receptionist');
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 403);
  assert.match(result.body.message, /not authorized/i);
});

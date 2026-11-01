'use strict';

// Fields that must never leave the API in a response body. The intentional
// `token` returned by login/register/reset/update-password is deliberately NOT
// listed here: it is the credential the caller asked for.
const SENSITIVE_FIELD_NAMES = Object.freeze([
  'password',
  'passwordHash',
  'resetPasswordToken',
  'resetPasswordExpire',
  'verificationToken',
  'emailVerificationToken',
  'refreshToken',
  'tokenVersion',
  'failedLoginCount',
  'lockedUntil',
]);

const SENSITIVE_FIELDS = new Set(SENSITIVE_FIELD_NAMES);

// The only User columns any controller may select when a user record (or a
// user nested under a doctor/patient/staff/bill/appointment) is returned.
const SAFE_USER_SELECT = Object.freeze({
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  subRole: true,
  gender: true,
  dateOfBirth: true,
  street: true,
  city: true,
  state: true,
  zipCode: true,
  country: true,
  avatar: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

// Recursively removes sensitive keys from plain objects/arrays. Non-plain
// objects (Date, Buffer, class instances) are returned untouched, and cycles
// are cut rather than followed.
function stripSensitiveFields(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return undefined;
    seen.add(value);
    return value.map((item) => stripSensitiveFields(item, seen));
  }
  if (!isPlainObject(value)) return value;
  if (seen.has(value)) return undefined;
  seen.add(value);
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    result[key] = stripSensitiveFields(child, seen);
  }
  return result;
}

// Returns every path at which a sensitive key appears (used by tests).
function findSensitiveFieldPaths(value, path = '$', seen = new WeakSet(), found = []) {
  if (value === null || typeof value !== 'object') return found;
  if (seen.has(value)) return found;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => findSensitiveFieldPaths(item, `${path}[${index}]`, seen, found));
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_FIELDS.has(key)) found.push(`${path}.${key}`);
    findSensitiveFieldPaths(child, `${path}.${key}`, seen, found);
  }
  return found;
}

module.exports = {
  SENSITIVE_FIELD_NAMES,
  SAFE_USER_SELECT,
  stripSensitiveFields,
  findSensitiveFieldPaths,
};

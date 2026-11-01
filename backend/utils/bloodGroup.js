'use strict';

// Prisma's BloodGroup enum uses names (A_POSITIVE) mapped to DB values (A+).
// Clients may send either form; both normalize to the Prisma enum name.
const BLOOD_GROUP_BY_LABEL = Object.freeze({
  'A+': 'A_POSITIVE', 'A-': 'A_NEGATIVE', 'B+': 'B_POSITIVE', 'B-': 'B_NEGATIVE',
  'AB+': 'AB_POSITIVE', 'AB-': 'AB_NEGATIVE', 'O+': 'O_POSITIVE', 'O-': 'O_NEGATIVE',
});
const BLOOD_GROUP_NAMES = Object.freeze(Object.values(BLOOD_GROUP_BY_LABEL));

// Returns the enum name, null for empty input, or undefined when invalid.
const normalizeBloodGroup = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim().toUpperCase();
  if (BLOOD_GROUP_NAMES.includes(text)) return text;
  return BLOOD_GROUP_BY_LABEL[text] || undefined;
};

module.exports = { BLOOD_GROUP_BY_LABEL, BLOOD_GROUP_NAMES, normalizeBloodGroup };

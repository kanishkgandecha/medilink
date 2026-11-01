'use strict';

// Last-line redaction applied to every prompt before it leaves for the external
// AI provider. Removes email addresses and phone-like numbers (10+ digits, e.g.
// mobile or national ID numbers) that users may type into free text. It does
// not detect names or other identifiers — free text can still contain them
// (documented limitation; provider policy is decision D-04).
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_LIKE = /\+?\d[\d\s().-]{8,}\d/g;

function redactIdentifiers(text) {
  if (typeof text !== 'string' || !text) return text;
  return text
    .replace(EMAIL, '[email]')
    .replace(PHONE_LIKE, (match) => (match.replace(/\D/g, '').length >= 10 ? '[number]' : match));
}

module.exports = { redactIdentifiers };

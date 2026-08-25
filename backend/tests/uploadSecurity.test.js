'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hasValidImageSignature } = require('../middleware/upload');

test('avatar validation accepts matching image signatures', () => {
  assert.equal(hasValidImageSignature(Buffer.from('ffd8ffe00000000000000000', 'hex'), 'image/jpeg'), true);
  assert.equal(hasValidImageSignature(Buffer.from('89504e470d0a1a0a00000000', 'hex'), 'image/png'), true);
  assert.equal(hasValidImageSignature(Buffer.from('474946383961000000000000', 'hex'), 'image/gif'), true);
  assert.equal(hasValidImageSignature(Buffer.from('524946460000000057454250', 'hex'), 'image/webp'), true);
});

test('avatar validation rejects spoofed content', () => {
  const executable = Buffer.from('#!/bin/sh\necho unsafe');
  assert.equal(hasValidImageSignature(executable, 'image/jpeg'), false);
  assert.equal(hasValidImageSignature(executable, 'image/png'), false);
});

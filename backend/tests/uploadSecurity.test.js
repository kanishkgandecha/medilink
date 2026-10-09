'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hasValidImageSignature, hasValidReportFileSignature } = require('../middleware/upload');

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

test('report attachment validation accepts a genuine PDF signature', () => {
  const pdfHeader = Buffer.concat([Buffer.from('%PDF-1.4\n', 'ascii'), Buffer.alloc(4)]);
  assert.equal(hasValidReportFileSignature(pdfHeader, 'application/pdf'), true);
});

test('report attachment validation accepts genuine JPEG/PNG signatures (reuses image validation)', () => {
  assert.equal(hasValidReportFileSignature(Buffer.from('ffd8ffe00000000000000000', 'hex'), 'image/jpeg'), true);
  assert.equal(hasValidReportFileSignature(Buffer.from('89504e470d0a1a0a00000000', 'hex'), 'image/png'), true);
});

test('report attachment validation rejects an executable renamed to look like a PDF', () => {
  const elfHeader = Buffer.from('7f454c460000000000000000', 'hex'); // ELF magic bytes
  assert.equal(hasValidReportFileSignature(elfHeader, 'application/pdf'), false);
});

test('report attachment validation rejects a plain-text file spoofing a PDF mimetype', () => {
  const notAPdf = Buffer.from('This is not a real PDF file');
  assert.equal(hasValidReportFileSignature(notAPdf, 'application/pdf'), false);
});

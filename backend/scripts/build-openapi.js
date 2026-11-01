#!/usr/bin/env node
'use strict';

// Regenerates backend/openapi/openapi.json from backend/openapi/catalog.js.
//   node scripts/build-openapi.js          write the file
//   node scripts/build-openapi.js --check  fail if the committed file is stale
const fs = require('fs');
const path = require('path');
const { buildSpec } = require('../openapi/build');
const { validateOpenApi } = require('../openapi/validate');

const target = path.join(__dirname, '..', 'openapi', 'openapi.json');
const spec = buildSpec();
const problems = validateOpenApi(spec);
if (problems.length) {
  console.error(`OpenAPI validation failed (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
const output = `${JSON.stringify(spec, null, 2)}\n`;
const operations = Object.values(spec.paths).reduce((sum, item) => sum + Object.keys(item).length, 0);

if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (current !== output) {
    console.error('openapi/openapi.json is out of date. Run: npm run openapi:build');
    process.exit(1);
  }
  console.log(`openapi: up to date and valid (${operations} operations)`);
} else {
  fs.writeFileSync(target, output);
  console.log(`openapi: wrote ${path.relative(process.cwd(), target)} (${operations} operations, valid)`);
}

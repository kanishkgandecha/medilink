'use strict';

// Structural validator for the subset of OpenAPI 3.1 used by MediLink, plus
// content-safety checks. Dependency-free so it runs in CI and unit tests.

const { ALL_ROLES, ANY } = require('./catalog');

const METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace']);
const PARAM_IN = new Set(['path', 'query', 'header', 'cookie']);
const JSON_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null']);
const VALID_ROLE_VALUES = new Set([...ALL_ROLES, ANY, 'public']);

// Content that must never appear in a published contract.
const FORBIDDEN_CONTENT = [
  [/Password123/i, 'demo password'],
  [/sk-or-v1-[a-z0-9]/i, 'OpenRouter API key'],
  [/postgres(ql)?:\/\/[^\s"]*@/i, 'database connection string with credentials'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
  [/BEGIN [A-Z ]*PRIVATE KEY/, 'private key'],
  [/\/Users\/|\/home\/|[A-Z]:\\\\/, 'local filesystem path'],
  [/private-uploads\//, 'internal storage path'],
  [/@medilink\.com/i, 'demo account email'],
];

function resolvePointer(doc, ref) {
  if (!ref.startsWith('#/')) return undefined;
  return ref.slice(2).split('/').reduce((node, key) => (node == null ? undefined : node[key.replace(/~1/g, '/').replace(/~0/g, '~')]), doc);
}

function walkSchemas(node, visit, path = '$') {
  if (Array.isArray(node)) { node.forEach((item, index) => walkSchemas(item, visit, `${path}[${index}]`)); return; }
  if (node && typeof node === 'object') {
    visit(node, path);
    for (const [key, child] of Object.entries(node)) walkSchemas(child, visit, `${path}.${key}`);
  }
}

function validateOpenApi(doc) {
  const problems = [];
  const fail = (message) => problems.push(message);

  if (typeof doc !== 'object' || doc === null) return ['document must be an object'];
  if (!/^3\.1\.\d+$/.test(doc.openapi || '')) fail('openapi must be a 3.1.x version string');
  if (!doc.info || typeof doc.info.title !== 'string' || typeof doc.info.version !== 'string') fail('info.title and info.version are required strings');
  if (!doc.paths || typeof doc.paths !== 'object') { fail('paths object is required'); return problems; }

  const schemes = new Set(Object.keys(doc.components?.securitySchemes || {}));
  const declaredTags = new Set((doc.tags || []).map((tag) => tag.name));
  const operationIds = new Set();

  for (const [path, item] of Object.entries(doc.paths)) {
    if (!path.startsWith('/')) fail(`path "${path}" must start with "/"`);
    const templateParams = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    for (const [method, op] of Object.entries(item)) {
      const where = `${method.toUpperCase()} ${path}`;
      if (!METHODS.has(method)) { fail(`${where}: unknown method`); continue; }
      if (typeof op.operationId !== 'string' || !op.operationId) fail(`${where}: operationId is required`);
      else if (operationIds.has(op.operationId)) fail(`${where}: duplicate operationId ${op.operationId}`);
      else operationIds.add(op.operationId);
      if (typeof op.summary !== 'string' || !op.summary) fail(`${where}: summary is required`);
      for (const tag of op.tags || []) if (!declaredTags.has(tag)) fail(`${where}: tag "${tag}" is not declared`);

      const params = op.parameters || [];
      const seen = new Set();
      for (const param of params) {
        if (!PARAM_IN.has(param.in)) fail(`${where}: parameter ${param.name} has invalid "in"`);
        const key = `${param.in}:${param.name}`;
        if (seen.has(key)) fail(`${where}: duplicate parameter ${key}`);
        seen.add(key);
        if (param.in === 'path' && param.required !== true) fail(`${where}: path parameter ${param.name} must be required`);
        if (!param.schema) fail(`${where}: parameter ${param.name} needs a schema`);
      }
      const declaredPath = params.filter((p) => p.in === 'path').map((p) => p.name);
      for (const name of templateParams) if (!declaredPath.includes(name)) fail(`${where}: path parameter {${name}} is not declared`);
      for (const name of declaredPath) if (!templateParams.includes(name)) fail(`${where}: declared path parameter ${name} is not in the template`);

      if (op.requestBody && !Object.keys(op.requestBody.content || {}).length) fail(`${where}: requestBody needs content`);
      if (!op.responses || !Object.keys(op.responses).length) fail(`${where}: at least one response is required`);
      for (const [code, response] of Object.entries(op.responses || {})) {
        if (!/^[1-5]\d\d$/.test(code) && code !== 'default') fail(`${where}: invalid response code ${code}`);
        if (typeof response.description !== 'string') fail(`${where}: response ${code} needs a description`);
      }
      if (!Object.keys(op.responses || {}).some((code) => /^2/.test(code))) fail(`${where}: no success response`);

      for (const requirement of op.security || []) {
        for (const name of Object.keys(requirement)) if (!schemes.has(name)) fail(`${where}: unknown security scheme ${name}`);
      }
      const roles = op['x-roles'];
      if (!Array.isArray(roles) || !roles.length) fail(`${where}: x-roles is required`);
      else for (const role of roles) if (!VALID_ROLE_VALUES.has(role)) fail(`${where}: unknown role "${role}" in x-roles`);
      const isPublic = Array.isArray(roles) && roles.includes('public');
      if (isPublic && (op.security || []).length) fail(`${where}: public operation must not require security`);
      if (!isPublic && !(op.security || []).length) fail(`${where}: protected operation must declare security`);
      if (!isPublic && !op.responses?.['401']) fail(`${where}: protected operation must document 401`);
      if (typeof op['x-state-changing'] !== 'boolean') fail(`${where}: x-state-changing must be boolean`);
    }
  }

  walkSchemas(doc, (node, path) => {
    if (typeof node.$ref === 'string' && resolvePointer(doc, node.$ref) === undefined) fail(`${path}: unresolved $ref ${node.$ref}`);
    if (node.type !== undefined && path.includes('schema') || (node.type !== undefined && path.includes('components.schemas'))) {
      const types = Array.isArray(node.type) ? node.type : [node.type];
      for (const type of types) if (typeof type === 'string' && !JSON_TYPES.has(type) && !['http', 'apiKey', 'oauth2', 'openIdConnect'].includes(type)) fail(`${path}: invalid JSON Schema type "${type}"`);
    }
  });

  const serialized = JSON.stringify(doc);
  for (const [pattern, label] of FORBIDDEN_CONTENT) if (pattern.test(serialized)) fail(`document contains forbidden content: ${label}`);

  return problems;
}

module.exports = { validateOpenApi };

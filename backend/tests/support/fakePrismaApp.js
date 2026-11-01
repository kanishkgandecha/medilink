'use strict';

// Boots the real Express app (real routes, middleware, controllers) against an
// in-memory fake Prisma client injected through the CommonJS module cache.
// No database is contacted. Each test file runs in its own process under
// `node --test`, so the injected module does not leak between files.

const crypto = require('crypto');
const path = require('path');

const matchesStatus = (status, filter) => {
  if (filter === undefined) return true;
  if (typeof filter === 'string') return status === filter;
  if (filter.not !== undefined) return status !== filter.not;
  if (Array.isArray(filter.in)) return filter.in.includes(status);
  return true;
};

const idsFromWhere = (where) => (where?.OR || []).map((clause) => clause.id ?? clause.legacyMongoId).filter(Boolean);

function createFakePrisma(state) {
  const calls = [];
  const byIdOrLegacy = (rows, where) => {
    const ids = idsFromWhere(where);
    if (where?.id) ids.push(where.id);
    return rows.find((row) => ids.includes(row.id)) || null;
  };

  const handlers = {
    user: {
      findFirst: ({ where }) => byIdOrLegacy(state.users, where),
    },
    patient: {
      findFirst: ({ where }) => (where?.userId
        ? state.patients.find((p) => p.userId === where.userId) || null
        : byIdOrLegacy(state.patients, where)),
      findUnique: ({ where }) => state.patients.find((p) => p.id === where?.id || p.userId === where?.userId) || null,
    },
    doctor: {
      findFirst: ({ where }) => (where?.userId
        ? state.doctors.find((d) => d.userId === where.userId) || null
        : byIdOrLegacy(state.doctors, where)),
    },
    appointment: {
      findFirst: ({ where }) => {
        if (where?.OR) return state.appointmentRecord || null;
        const hit = state.appointments.find((a) => (!where.doctorId || a.doctorId === where.doctorId)
          && a.patientId === where.patientId && matchesStatus(a.status, where.status));
        return hit ? { id: hit.id } : null;
      },
    },
    prescription: {
      findFirst: ({ where }) => {
        if (where?.OR) return null;
        const hit = state.prescriptions.find((p) => p.doctorId === where.doctorId && p.patientId === where.patientId);
        return hit ? { id: hit.id } : null;
      },
    },
    bed: {
      findFirst: ({ where }) => {
        const hit = state.beds.find((b) => b.patientId === where.patientId && b.isOccupied);
        return hit ? { id: hit.id } : null;
      },
    },
  };

  const defaultFor = (method) => {
    if (method === 'findMany' || method === 'groupBy') return [];
    if (method === 'count') return 0;
    if (method === 'aggregate') return { _sum: {}, _count: {}, _avg: {} };
    if (method.startsWith('find')) return null;
    if (['create', 'update', 'upsert'].includes(method)) return { id: crypto.randomUUID() };
    return {};
  };

  let client;
  const modelProxy = (model) => new Proxy({}, {
    get(_target, method) {
      if (typeof method !== 'string' || method === 'then') return undefined;
      return async (args = {}) => {
        calls.push({ model, method, args });
        if ((state.failModels || []).includes(model)) throw Object.assign(new Error('synthetic storage failure'), { code: 'P2021' });
        const handler = handlers[model]?.[method];
        return handler ? handler(args) : defaultFor(method);
      };
    },
  });

  client = new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== 'string' || prop === 'then') return undefined;
      if (prop === '$transaction') {
        return async (arg) => (typeof arg === 'function' ? arg(client) : Promise.all(arg));
      }
      if (prop === '$connect' || prop === '$disconnect') return async () => {};
      if (prop === '$queryRaw') {
        return async () => {
          if (state.failQueryRaw) throw Object.assign(new Error('synthetic connection failure to db.internal:5432'), { name: 'PrismaClientInitializationError' });
          return [{ '?column?': 1 }];
        };
      }
      return modelProxy(prop);
    },
  });
  return { client, calls };
}

function bootFakeApp(state) {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://fake:fake-unused-password@fake.invalid:5432/fake_test';
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('base64');

  const fake = createFakePrisma(state);
  const prismaPath = path.join(__dirname, '..', '..', 'config', 'prisma.js');
  require.cache[require.resolve(prismaPath)] = {
    id: prismaPath, filename: prismaPath, loaded: true, exports: fake.client,
  };
  const app = require('../../server');
  const { generateToken } = require('../../utils/userHelpers');
  return { app, calls: fake.calls, tokenFor: (user) => generateToken(user) };
}

async function listen(app) {
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (apiPath, { token, method = 'GET', body } = {}) => {
    const response = await fetch(`${baseUrl}${apiPath}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_error) { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  };
  return { server, request, close: () => new Promise((resolve) => server.close(resolve)) };
}

module.exports = { createFakePrisma, bootFakeApp, listen };

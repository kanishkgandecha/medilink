'use strict';
const { spawnSync } = require('child_process');
require('dotenv').config();

const url = new URL(process.env.DATABASE_URL);
const role = decodeURIComponent(url.username);
const password = decodeURIComponent(url.password);
const database = url.pathname.slice(1);
const identifier = /^[A-Za-z_][A-Za-z0-9_]*$/;
if (!identifier.test(role) || !identifier.test(database) || !password) {
  throw new Error('DATABASE_URL contains an unsafe or incomplete local database target');
}
const quoteIdentifier = (value) => `"${value.replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${value.replace(/'/g, "''")}'`;
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error((result.stderr || 'Database initialization failed').trim());
  return result.stdout;
};

const roleExists = run('psql', ['-d', 'postgres', '-tAc', `SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(role)}`]).trim() === '1';
if (roleExists) {
  run('psql', ['-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `ALTER ROLE ${quoteIdentifier(role)} LOGIN PASSWORD ${quoteLiteral(password)}`]);
} else {
  run('psql', ['-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE ROLE ${quoteIdentifier(role)} LOGIN PASSWORD ${quoteLiteral(password)}`]);
}

const databaseExists = run('psql', ['-d', 'postgres', '-tAc', `SELECT 1 FROM pg_database WHERE datname = ${quoteLiteral(database)}`]).trim() === '1';
if (!databaseExists) run('createdb', ['-O', role, database]);
console.log('Configured local PostgreSQL role and database are ready.');

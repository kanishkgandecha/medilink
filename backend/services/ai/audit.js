'use strict';
const prisma = require('../../config/prisma');
let lastPruneAt = 0;

const retentionDays = () => Math.max(7, Math.min(3650, Number(process.env.AI_AUDIT_RETENTION_DAYS) || 90));

async function pruneExpiredAudits() {
  if (Date.now() - lastPruneAt < 24 * 60 * 60 * 1000) return;
  lastPruneAt = Date.now();
  const cutoff = new Date(Date.now() - retentionDays() * 24 * 60 * 60 * 1000);
  try {
    await prisma.aiAuditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  } catch (error) {
    console.warn('[AI audit] Unable to apply retention policy:', error.code || 'prune_failed');
  }
}

const safeErrorCode = (error) => {
  if (!error) return null;
  if (typeof error.code === 'string' && /^[A-Z0-9_]{1,50}$/i.test(error.code)) return error.code;
  return 'AI_EXECUTION_ERROR';
};

async function writeAudit(event) {
  try {
    await prisma.aiAuditEvent.create({ data: event });
    void pruneExpiredAudits();
  } catch (error) {
    // Auditing is best-effort so a pending migration never breaks clinical workflows.
    console.warn('[AI audit] Unable to persist audit metadata:', error.code || 'write_failed');
  }
}

async function getAiAuditSummary(hours = 24) {
  const safeHours = Math.max(1, Math.min(720, Number(hours) || 24));
  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
  const [events, byAgent, bySource] = await Promise.all([
    prisma.aiAuditEvent.findMany({ where: { createdAt: { gte: since } },
      select: { success: true, degraded: true, durationMs: true, createdAt: true } }),
    prisma.aiAuditEvent.groupBy({ by: ['agent'], where: { createdAt: { gte: since } },
      _count: { _all: true }, _avg: { durationMs: true } }),
    prisma.aiAuditEvent.groupBy({ by: ['source'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ]);
  const total = events.length;
  const failures = events.filter((event) => !event.success).length;
  const degraded = events.filter((event) => event.degraded).length;
  const averageDurationMs = total ? Math.round(events.reduce((sum, event) => sum + event.durationMs, 0) / total) : 0;
  return {
    windowHours: safeHours, total, failures, degraded, averageDurationMs,
    successRate: total ? Math.round(((total - failures) / total) * 1000) / 10 : null,
    degradedRate: total ? Math.round((degraded / total) * 1000) / 10 : null,
    byAgent: byAgent.map((row) => ({ agent: row.agent, requests: row._count._all, averageDurationMs: Math.round(row._avg.durationMs || 0) })),
    bySource: bySource.map((row) => ({ source: row.source, requests: row._count._all })),
    provider: {
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 10000,
    },
    retentionDays: retentionDays(), generatedAt: new Date().toISOString(),
  };
}

async function runAuditedAi({ agent, requesterId, operation }) {
  const started = Date.now();
  try {
    const data = await operation();
    await writeAudit({
      requesterId, agent, source: data?._source || 'rules', model: data?._model || null,
      degraded: Boolean(data?._degraded), success: true, durationMs: Date.now() - started,
    });
    return data;
  } catch (error) {
    await writeAudit({ requesterId, agent, source: 'error', degraded: false, success: false,
      durationMs: Date.now() - started, errorCode: safeErrorCode(error) });
    throw error;
  }
}

module.exports = { runAuditedAi, getAiAuditSummary, retentionDays };

CREATE TABLE "AiAuditEvent" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "model" TEXT,
  "degraded" BOOLEAN NOT NULL DEFAULT false,
  "success" BOOLEAN NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiAuditEvent_requesterId_createdAt_idx" ON "AiAuditEvent"("requesterId", "createdAt");
CREATE INDEX "AiAuditEvent_agent_createdAt_idx" ON "AiAuditEvent"("agent", "createdAt");
ALTER TABLE "AiAuditEvent" ADD CONSTRAINT "AiAuditEvent_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
